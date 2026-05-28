import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";

export default function Login() {
  const { instance } = useMsal();

  const handleLogin = async () => {
  try {
    await instance.loginRedirect(loginRequest);
  } catch (error) {
    console.error(error);
  }
};

  return (
    <button onClick={handleLogin}>
      Login with Azure
    </button>
  );
}
