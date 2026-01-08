import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";

import { useSettings } from "./state/useSettings";

function Root() {
  const { settings, setThemeMode, setDefaultViewMode, setDefaultSortKey, setDefaultSortOrder } = useSettings();

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: { mode: settings.themeMode },
        typography: {
          fontFamily: [
            "system-ui",
            "-apple-system",
            "Segoe UI",
            "Roboto",
            "Noto Sans TC",
            "Arial",
            "sans-serif",
          ].join(","),
        },
      }),
    [settings.themeMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App
        settings={settings}
        actions={{
          setThemeMode,
          setDefaultViewMode,
          setDefaultSortKey,
          setDefaultSortOrder,
        }}
      />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
