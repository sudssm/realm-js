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

import { Realm } from "realm";
import { useApp } from "@realm/react";

import { PageLayout } from "./components/PageLayout";
import { useEffect, useRef, useState } from "react";
import { TaskPage } from "./pages/TaskPage";
import { Credentials } from "realm";

/**
 * The part of the React tree having access to an authenticated user. It
 * renders `@realm/react`'s `UserProvider` for providing the App User once
 * authenticated and `RealmProvider` for opening a Realm.
 */

export function AuthenticatedApp(props: { app: Realm.App; realm: Realm; onLogout: () => void }) {
  const [rerender, setRerender] = useState(0); // hack to force a rerender
  const tablesRef = useRef<string[]>([]);
  const realm = props.realm;

  const forceRerender = () => {
    setRerender(new Date().getTime());
  };

  useEffect(() => {
    async function fn() {
      const resetSubs = () => {
        tablesRef.current = [];
        // realm.subscriptions.update((subs, realm) => {
        // subs.removeAll();
        realm.schema.forEach((schema) => {
          if (schema.asymmetric || schema.embedded) {
            return;
          }
          // subs.add(realm.objects(schema.name));
          tablesRef.current.push(schema.name);
        });
        // });
        forceRerender();
      };

      // console.log("opened");
      realm.addListener("schema", resetSubs);
      realm.addListener("change", forceRerender);

      resetSubs();
    }
    fn();
  }, []);

  return (
    // The component set as the `fallback` prop will be rendered if a user has
    // not been authenticated. In this case, we will navigate the user to the
    // unauthenticated route via the `Navigate` component. Once authenticated,
    // `RealmProvider` will have access to the user and set it in the Realm
    // configuration; therefore, you don't have to explicitly provide it here.
    <PageLayout {...props}>
      <TaskPage realm={realm} tables={tablesRef.current} rerender={rerender} />
    </PageLayout>
  );
}
