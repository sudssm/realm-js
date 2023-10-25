////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

import { useEffect, useState } from "react";
import { Realm, Credentials } from "realm";

import logo from "../assets/atlas-app-services.png";
import styles from "../styles/LoginPage.module.css";
import { parse } from "@typescript-eslint/parser";

enum AuthProvider {
  UserPassword = "username/password",
  Anonymous = "anonymous",
  APIKey = "apikey",
}

interface LoginProps {
  setApp?: (app: Realm.App) => void;
}
const LOCAL_STORAGE_KEY = "stitchutils_app";

export default function LoginPage(props: LoginProps) {
  const [baseURL, setBaseURL] = useState<string>("https://realm.mongodb.com");
  const [appID, setAppID] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");
  const [authProvider, setAuthProvider] = useState<AuthProvider>(AuthProvider.Anonymous);

  async function tryLogin(
    baseURL: string,
    appID: string,
    apiKey: string,
    username: string,
    password: string,
    authProvider: string,
  ) {
    let credentials;
    if (authProvider === AuthProvider.Anonymous) {
      credentials = Credentials.anonymous();
    } else if (authProvider === AuthProvider.APIKey) {
      credentials = Credentials.apiKey(apiKey);
    } else if (authProvider === AuthProvider.UserPassword) {
      credentials = Credentials.emailPassword(username, password);
    } else {
      return;
    }

    setLoginError("");
    const app: Realm.App = new Realm.App({ id: appID, baseUrl: baseURL });

    // Authenticate the user
    const user: Realm.User = await app.logIn(credentials);
    if (props.setApp) {
      props!.setApp(app);
    }
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ baseURL, appID, apiKey, username, password, authProvider }),
    );

    return user;
  }

  useEffect(() => {
    const storedAppInfo = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!storedAppInfo) {
      return;
    }
    try {
      const parsedAppInfo = JSON.parse(storedAppInfo);

      setBaseURL(parsedAppInfo.baseURL || "");
      setAppID(parsedAppInfo.appID || "");
      setApiKey(parsedAppInfo.apiKey || "");
      setUsername(parsedAppInfo.username || "");
      setPassword(parsedAppInfo.password || "");
      setAuthProvider(parsedAppInfo.authProvider || "");

      if (parsedAppInfo.authProvider) {
        // try to reuse cached creds
        // tryLogin(
        //   parsedAppInfo.baseURL,
        //   parsedAppInfo.appID,
        //   parsedAppInfo.apiKey,
        //   parsedAppInfo.username,
        //   parsedAppInfo.password,
        //   parsedAppInfo.authProvider,
        // );
      }
    } catch (e) {}
  }, []);

  const login = async () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setLoginError("");

    try {
      tryLogin(baseURL, appID, apiKey, username, password, authProvider);
    } catch (err: any) {
      setLoginError(err.message);
    }
  };

  return (
    <div className={styles.container}>
      <img alt="Atlas Device Sync" className={styles.logo} src={logo} />
      <h1>Atlas Device Sync Playground</h1>
      <form className={styles.form}>
        <div className="input-group">
          <label>Base URL</label>
          <select className={styles.input} onChange={(e) => setBaseURL(e.target.value)} value={baseURL}>
            {[
              "https://realm.mongodb.com",
              "https://realm-qa.mongodb.com",
              "https://realm-dev.mongodb.com",
              "https://realm-staging.mongodb.com",
              "http://localhost:8080",
            ].map((b) => (
              <option value={b} key={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label>App ID</label>
          <input
            className={styles.input}
            type="text"
            placeholder="myapp-foo"
            onChange={(e) => setAppID(e.target.value)}
            value={appID}
          />
        </div>
        <div className="input-group">
          <br />
          <label>Auth Provider</label>
          <select
            className={styles.input}
            onChange={(e) => setAuthProvider(e.target.value as AuthProvider)}
            value={authProvider}
          >
            {[AuthProvider.UserPassword, AuthProvider.Anonymous, AuthProvider.APIKey].map((b) => (
              <option value={b} key={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        {authProvider === AuthProvider.APIKey && (
          <div className="input-group">
            <label>API Key</label>
            <input className={styles.input} type="text" onChange={(e) => setApiKey(e.target.value)} value={apiKey} />
          </div>
        )}
        {authProvider === AuthProvider.UserPassword && (
          <div className="input className={styles.input}-group">
            <label>Username</label>
            <input
              className={styles.input}
              type="text"
              onChange={(e) => setUsername(e.target.value)}
              value={username}
            />
          </div>
        )}
        {authProvider === AuthProvider.UserPassword && (
          <div className="input-group">
            <label>Password</label>
            <input
              className={styles.input}
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              value={password}
            />
          </div>
        )}

        <div className={styles.buttons}>
          <button
            className={styles.button}
            onClick={(e) => {
              e.preventDefault();
              login();
            }}
            disabled={appID.length === 0}
          >
            log in
          </button>
        </div>
        {loginError && <div className={styles.error}>{loginError}</div>}
      </form>
    </div>
  );
}
