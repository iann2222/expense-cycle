import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { registerSW } from "virtual:pwa-register";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";

import { useSettings } from "./state/useSettings";

function Root() {
  const { settings, actions } = useSettings();

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: settings.themeMode,
        },
        components: {
          MuiDialog: {
            styleOverrides: {
              paper: { boxShadow: "none" },
            },
          },
        },
      }),
    [settings.themeMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App settings={settings} actions={actions} />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

const updateSW = registerSW({
  onNeedRefresh() {
    // 你想用 MUI Dialog 更漂亮也行；先用最簡單可用版
    const ok = confirm("有新版本可用，是否立即更新？");
    if (ok) updateSW(true);
  },
  onOfflineReady() {
    // 代表可離線了（第一次安裝/更新後）
    // 先不吵使用者，你也可以 console.log
    console.log("App 已可離線使用");
  },
});
