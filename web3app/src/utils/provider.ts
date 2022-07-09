import { ethers } from "ethers";

let provider: ExternalProvider | JsonRpcFetchFunc;
function getProvider() {
  if (window.ethereum) {
    if (!provider) {
      provider = new ethers.providers.Web3Provider(window.ethereum);
      console.log("create a new provider");
    }
  }

  return provider;
}

export { getProvider };
