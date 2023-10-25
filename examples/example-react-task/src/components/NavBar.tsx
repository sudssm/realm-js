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

import { useState } from "react";
import styles from "../styles/NavBar.module.css";

/**
 * Nav bar providing a button for logging out.
 */
export function NavBar(props: { app: Realm.App; onLogout: () => void; setSyncPause: (paused: boolean) => void }) {
  const [paused, setPaused] = useState(false);

  const handleLogout = () => {
    props.app.currentUser?.logOut();
    props.onLogout();
  };
  const handlePauseClick = () => {
    setPaused(!paused);
    props.setSyncPause(!paused);
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.titleContainer}>
        <p className={styles.title}>{props.app.currentUser?.profile.email}</p>
        <p className={styles.info}>{`App ID: ${props.app.id}`}</p>
      </div>
      <button className={styles.button} onClick={handlePauseClick}>
        {paused ? "Resume" : "Pause"} Sync
      </button>

      <button className={styles.button} onClick={handleLogout}>
        Log out
      </button>
    </nav>
  );
}
