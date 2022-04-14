import React from 'react';
import './App.css';
import { ExplorerProvider } from "./client/contexts/ExplorerContext";
import Roots from './client/components/Roots';
import "./client/styles.css";


function App() {
  return (
    <ExplorerProvider>
    <Roots />
  </ExplorerProvider>
  );
}

export default App;
