import { Trans } from "@lingui/macro";
import { Box, SwipeableDrawer, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Icon, SecondaryButton, TabBar } from "@olympusdao/component-library";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ConnectButton, InPageConnectButton } from "src/components/ConnectButton/ConnectButton";
import { useConnect, useDisconnect } from "wagmi";

import Assets from "./Assets";
import GetOhm from "./GetOhm";
import { Info } from "./Info";

const PREFIX = "Wallet";

const classes = {
  root: `${PREFIX}-root`,
  paper: `${PREFIX}-paper`,
  networkSelector: `${PREFIX}-networkSelector`,
  connectButton: `${PREFIX}-connectButton`,
};

// TODO jss-to-styled codemod: The Fragment root was replaced by div. Change the tag if needed.
const StyledSwipeableDrawer = styled(SwipeableDrawer)(({ theme }) => ({
  [`& .${classes.networkSelector}`]: {
    background: theme.colors.paper.card,
    minHeight: "39px",
    borderRadius: "6px",
    padding: "9px 18px",
    alignItems: "center",
  },

  [`& .${classes.connectButton}`]: {
    background: theme.colors.paper.card,
    "&:hover": {
      background: theme.colors.paper.cardHover,
    },
  },

  [`&.${classes.root}`]: {
    width: "460px",
    maxWidth: "100%",
  },

  [`& .${classes.paper}`]: {
    maxWidth: "100%",
    background: theme.colors.paper.background,
  },
}));

export function Wallet(props: { open?: boolean; component?: string }) {
  interface LocationState {
    state: { prevPath: string };
  }
  const { state: closeRedirect } = useLocation() as LocationState;
  const [closeLocation, setCloseLocation] = useState("/");

  //Watch for PrevPath passed in and set it as path to close.
  useEffect(() => {
    if (closeRedirect && closeRedirect.prevPath) {
      setCloseLocation(closeRedirect.prevPath);
    }
  }, [closeRedirect]);

  const navigate = useNavigate();

  const { isConnected } = useConnect();

  // only enable backdrop transition on ios devices,
  // because we can assume IOS is hosted on hight-end devices and will not drop frames
  // also disable discovery on IOS, because of it's 'swipe to go back' feat
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const DisconnectButton = () => {
    const { disconnect } = useDisconnect();
    return (
      <SecondaryButton onClick={disconnect}>
        <Trans>Disconnect</Trans>
      </SecondaryButton>
    );
  };

  const ConnectMessage = () => (
    <Box display="flex" justifyContent="center" mt={"32px"}>
      <Typography variant={"h6"}> Please Connect Your Wallet </Typography>
    </Box>
  );

  return (
    <StyledSwipeableDrawer
      disableBackdropTransition={!isIOS}
      disableDiscovery={isIOS}
      anchor="right"
      open={props.open ? true : false}
      onOpen={() => null}
      onClose={() => navigate(closeLocation)}
      classes={{
        root: classes.root,
        paper: classes.paper,
      }}
    >
      <Box p="30px 15px" style={{ overflow: "hidden" }}>
        <Box style={{ top: 0, position: "sticky" }}>
          <Box display="flex" justifyContent="space-between" mb={"18px"}>
            <Box>
              <ConnectButton />
            </Box>
            <Box display="flex" flexDirection="row" justifyContent="flex-end" alignItems="center" textAlign="right">
              <Icon
                onClick={() => {
                  navigate(closeLocation);
                }}
                style={{ cursor: "pointer" }}
                name="x"
              />
            </Box>
          </Box>
          <TabBar
            items={[
              { label: "Wallet", to: "/wallet" },
              { label: "Utility", to: "/utility" },
              { label: "Info", to: "/info" },
            ]}
            mb={"18px"}
          />
        </Box>
        <Box
          style={{
            height: "100vh",
            display: "block",
            overflowY: "scroll",
            overflowX: "hidden",
            paddingBottom: "calc(85%)",
          }}
        >
          {(() => {
            switch (props.component) {
              case "info":
                return <Info />;
              case "utility":
                return <GetOhm />;
              case "wallet":
                return <>{!isConnected ? <ConnectMessage /> : <Assets />}</>;
              case "wallet/history":
                return <Assets path="history" />;
              default:
                <></>;
            }
          })()}
        </Box>
      </Box>
      <Box
        display="flex"
        flexDirection="row"
        justifyContent="center"
        style={{ position: "sticky", bottom: 0, boxShadow: "0px -3px 3px rgba(0, 0, 0, 0.1)" }}
        pt={"21px"}
        pb={"21px"}
      >
        {isConnected ? <DisconnectButton /> : <InPageConnectButton />}
      </Box>
    </StyledSwipeableDrawer>
  );
}

export default Wallet;
