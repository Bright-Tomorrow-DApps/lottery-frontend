import "./App.css";
import Main from "./components/Main";
import useMediaQuery from "@mui/material/useMediaQuery";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import * as React from "react";

function App() {
  const darkTheme = createTheme({
    palette: {
      mode: "dark",
    },
  });

  return (
    <div className="App">
      {/* <ThemeProvider theme={darkTheme}> */}
      <Main />
      {/* </ThemeProvider> */}
    </div>
  );
}

export default App;
