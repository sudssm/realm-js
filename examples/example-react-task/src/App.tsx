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
import { useState, useCallback, useEffect } from "react";

import { AuthenticatedApp } from "./AuthenticatedApp";
import styles from "./styles/App.module.css";
import LoginPage from "./pages/LoginPage";

function App() {
  const [app, setApp] = useState<Realm.App>();
  const [realm, setRealm] = useState<Realm>();
  const onLogout = useCallback(() => {
    setApp(undefined);
    realm?.close();
  }, []);

  const handleSetApp = useCallback(async (app: Realm.App) => {
    setApp(app);

    const realm = await Realm.open({
      sync: {
        user: app.currentUser!,
        flexible: true,
      },
    });

    setRealm(realm);
  }, []);

  function setSyncPause(pause: boolean): void {
    if (pause) {
      realm?.syncSession?.pause();
      return;
    }
    realm?.syncSession?.resume();
  }

  return (
    <div className={styles.container}>
      {app && app.currentUser && realm ? (
        <AuthenticatedApp onLogout={onLogout} app={app} realm={realm} setSyncPause={setSyncPause} />
      ) : (
        <LoginPage setApp={handleSetApp} />
      )}
    </div>
  );
}

export default App;
