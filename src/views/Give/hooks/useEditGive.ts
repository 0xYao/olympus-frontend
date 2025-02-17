import { t } from "@lingui/macro";
import { ContractReceipt, ethers } from "ethers";
import { useMutation, useQueryClient } from "react-query";
import { useDispatch } from "react-redux";
import gOHM from "src/abi/gOHM.json";
import { GIVE_ADDRESSES, GOHM_ADDRESSES, SOHM_ADDRESSES } from "src/constants/addresses";
import { IUAData, trackGiveEvent } from "src/helpers/analytics/trackGiveEvent";
import { ACTION_GIVE_EDIT, ACTION_GIVE_WITHDRAW, getTypeFromAction } from "src/helpers/GiveHelpers";
import { balanceQueryKey } from "src/hooks/useBalance";
import { useDynamicGiveContract } from "src/hooks/useContract";
import { donationInfoQueryKey, recipientInfoQueryKey } from "src/hooks/useGiveInfo";
import { useTestableNetworks } from "src/hooks/useTestableNetworks";
import { error as createErrorToast, info as createInfoToast } from "src/slices/MessagesSlice";
import { useAccount, useNetwork, useSigner } from "wagmi";

import { EditGiveData } from "../Interfaces";

/**
 * @notice Increases the value of an active donation
 * @returns ContractReceipt for the deposit
 */
export const useIncreaseGive = () => {
  const dispatch = useDispatch();
  const client = useQueryClient();
  const { data: account } = useAccount();
  const networks = useTestableNetworks();
  const contract = useDynamicGiveContract(GIVE_ADDRESSES, true);

  const address = account?.address ? account.address : "";

  // Mutation to interact with the YieldDirector contract
  return useMutation<ContractReceipt, Error, EditGiveData>(
    // Pass in an object with an amount and a recipient parameter
    async ({ id: id_, amount: amount_, recipient: recipient_, token: token_ }) => {
      // Validate inputs
      if (parseFloat(amount_) <= 0) throw new Error(t`An increase Give amount must be positive`);

      // Confirm that the user is on a chain where YieldDirector exists
      if (!contract)
        throw new Error(
          t`Give is not supported on this network. Please switch to a supported network, such as Ethereum mainnet`,
        );
      if (!address) throw new Error(t`Please refresh your page and try again`);

      const uaData: IUAData = {
        address: address,
        value: amount_,
        recipient: recipient_,
        approved: true,
        txHash: null,
        type: getTypeFromAction(ACTION_GIVE_EDIT),
      };

      // Before we submit the transaction, record the event.
      // This lets us track if the user rejects/ignores the confirmation dialog.
      trackGiveEvent(uaData, uaData.type + "-before");

      // Create transaction to deposit passed amount to the passed recipient
      const transaction =
        token_ === "sOHM"
          ? await contract.addToSohmDeposit(id_, ethers.utils.parseUnits(amount_, "gwei"))
          : await contract.addToDeposit(id_, ethers.utils.parseEther(amount_));

      uaData.txHash = transaction.hash;
      trackGiveEvent(uaData);

      return transaction.wait();
    },
    {
      onError: error => {
        dispatch(createErrorToast(error.message));
      },
      onSuccess: async (data, EditGiveData) => {
        // Refetch sOHM balance and donation info
        const keysToRefetch = [
          balanceQueryKey(address, SOHM_ADDRESSES, networks.MAINNET),
          balanceQueryKey(address, GOHM_ADDRESSES, networks.MAINNET),
          donationInfoQueryKey(address, networks.MAINNET),
          recipientInfoQueryKey(EditGiveData.recipient, networks.MAINNET),
        ];

        const promises = keysToRefetch.map(key => client.refetchQueries(key, { active: true }));
        await Promise.all(promises);

        dispatch(createInfoToast(t`Successfully increased sOHM deposit`));
      },
    },
  );
};

/**
 * @notice Decreases the value of an active donation
 * @returns ContractReceipt for the deposit
 */
export const useDecreaseGive = () => {
  const dispatch = useDispatch();
  const client = useQueryClient();
  const { data: account } = useAccount();
  const { activeChain = { id: 1 } } = useNetwork();
  const { data: signer } = useSigner();
  const networks = useTestableNetworks();
  const contract = useDynamicGiveContract(GIVE_ADDRESSES, true);
  const address = account?.address ? account.address : "";
  const gohmContract = new ethers.Contract(
    GOHM_ADDRESSES[activeChain.id as keyof typeof GOHM_ADDRESSES],
    gOHM.abi,
    signer ? signer : undefined,
  );

  // Mutation to interact with the YieldDirector contract
  return useMutation<ContractReceipt, Error, EditGiveData>(
    // Pass in an object with an amount and a recipient parameter
    async ({ id: id_, amount: amount_, recipient: recipient_, token: token_ }) => {
      // Validate inputs
      if (parseFloat(amount_) <= 0) throw new Error(t`A decrease Give amount must be positive`);

      // Confirm that the user is on a chain where YieldDirector exists
      if (!contract)
        throw new Error(
          t`Give is not supported on this network. Please switch to a supported network, such as Ethereum mainnet`,
        );
      if (!address) throw new Error(t`No account available`);
      const uaData: IUAData = {
        address,
        value: amount_,
        recipient: recipient_,
        approved: true,
        txHash: null,
        type: getTypeFromAction(ACTION_GIVE_WITHDRAW),
      };

      // Before we submit the transaction, record the event.
      // This lets us track if the user rejects/ignores the confirmation dialog.
      trackGiveEvent(uaData, uaData.type + "-before");

      // Have to use balanceTo instead of useCurrentIndex because useCurrentIndex
      // only pulls the current index from mainnet, not the one used on testnet
      // Also have to check if the token is sOHM because if we try converting gOHM
      // values to 9 decimals we encounter underflow issues. Not sure if this is the
      // best solution.
      const gohmAmount_: string =
        token_ === "sOHM" ? (await gohmContract.balanceTo(ethers.utils.parseUnits(amount_, "gwei"))).toString() : "0";

      // Create transaction to withdraw passed amount from the passed recipient
      const transaction =
        token_ === "sOHM"
          ? await contract.withdrawPrincipalAsSohm(id_, ethers.utils.parseUnits(gohmAmount_, "gwei"))
          : await contract.withdrawPrincipal(id_, ethers.utils.parseEther(amount_));

      uaData.txHash = transaction.hash;
      trackGiveEvent(uaData);

      return transaction.wait();
    },
    {
      onError: error => {
        dispatch(createErrorToast(error.message));
      },
      onSuccess: async (data, EditGiveData) => {
        // Refetch balances and donation info
        const keysToRefetch = [
          balanceQueryKey(address, SOHM_ADDRESSES, networks.MAINNET),
          balanceQueryKey(address, GOHM_ADDRESSES, networks.MAINNET),
          donationInfoQueryKey(address, networks.MAINNET),
          recipientInfoQueryKey(EditGiveData.recipient, networks.MAINNET),
        ];

        const promises = keysToRefetch.map(key => client.refetchQueries(key, { active: true }));
        await Promise.all(promises);

        dispatch(createInfoToast(t`Successfully decreased sOHM deposit`));
      },
    },
  );
};
