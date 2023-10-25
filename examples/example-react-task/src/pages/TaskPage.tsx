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
import { JsonEditor as Editor } from "jsoneditor-react";
import { Realm } from "@realm/react";
import { BSON } from "realm";
// import { TaskList } from "../components/TaskList";
// import { useTaskManager } from "../hooks/useTaskManager";
import styles from "../styles/TaskPage.module.css";
import React, { useEffect, useRef, useState } from "react";
import { Node } from "jsoneditor";

/**
 * Displays the list of tasks as well as buttons for performing
 * sync-related operations.
 */
export function TaskPage(props: { realm: Realm; tables: string[]; rerender: number }) {
  const datas = props.tables.map(function (table) {
    return (
      <>
        <TableView key={table} realm={props.realm} table={table} rerender={props.rerender} />
      </>
    );
  });

  return <div className={styles.container}>{datas}</div>;
}

function TableView(props: { realm: Realm; table: string; rerender: number }) {
  const realm = props.realm;
  const [query, setQuery] = useState("truepredicate");
  const [filter, setFilter] = useState("truepredicate");
  const [objects, setObjects] = useState<any>();
  const [error, setError] = useState("");

  const updateQuery = async (query: string, filter: string) => {
    setError("");
    if (!query) {
      query = "truepredicate";
      setQuery(query);
    }
    if (!filter) {
      filter = "truepredicate";
      setFilter(filter);
    }
    try {
      await realm.subscriptions.update((subs, realm) => {
        subs.removeByName(props.table);
        subs.add(realm.objects(props.table).filtered(query), { name: props.table });
      });

      setObjects(props.realm.objects(props.table).filtered(filter));
    } catch (e: any) {
      console.error(e);
      setError(e.message || "invalid query");
    }
  };

  useEffect(() => {
    updateQuery("truepredicate", "truepredicate");
  }, []);

  const objectsDom = (objects as Realm.Results<Realm.Object>)?.map(function (object) {
    const key = object._objectKey();
    return (
      <p style={{ paddingBottom: 15 }}>
        <ObjectView key={key} realm={props.realm} object={object} rerender={props.rerender} />
      </p>
    );
  });
  return (
    <>
      <h1>{props.table}</h1>
      <div className="input-group">
        <label>Query</label>
        <input
          className={styles.input}
          type="text"
          placeholder="truepredicate"
          value={query}
          defaultValue={"truepredicate"}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label>Filter</label>
        <input
          className={styles.input}
          type="text"
          placeholder="truepredicate"
          value={filter}
          defaultValue={"truepredicate"}
          onChange={(e) => setFilter(e.target.value)}
        />

        <div className={styles.buttons}>
          <button
            className={styles.button}
            onClick={(e) => {
              e.preventDefault();
              updateQuery(query, filter);
            }}
          >
            Update
          </button>
        </div>
        <br />
        {error && <div className={styles.error}>{error}</div>}
      </div>
      <br />
      {objectsDom}
    </>
  );
}

function serializeValue(value: any): any {
  if (!value) {
    return value;
  }
  if (value instanceof BSON.ObjectId) {
    return value.toHexString();
  }
  if (typeof value == "object") {
    return serializeForView(value);
  }
  return value;
}

function serializeForView(object: Realm.Object): Record<string, any> {
  const out: Record<string, any> = {};
  Object.entries(object).forEach(([k, v]) => {
    // console.log(k, typeof v);
    out[k] = serializeValue(v);
  });
  return out;
}

function diffNewData(previous: Record<string, any>, update: Record<string, any>): [string[], any] {
  const entries = Object.entries(update);
  for (let index = 0; index < entries.length; index++) {
    const [k, v] = entries[index];

    if (previous[k] === v) {
      continue;
    }

    if (typeof v == "object") {
      if ((previous[k] && !v) || (v && !previous[k])) {
        return [[k], v];
      }
      const [path, value] = diffNewData(v, previous[k]);
      if (!value) {
        continue;
      }

      path.unshift(k);
      return [path, value];
    }

    return [[k], v];
  }
  return [[], null];
}

function ObjectView(props: { realm: Realm; object: Realm.Object; rerender: number }) {
  const serialized = serializeForView(props.object);
  const [previous, setPrevious] = useState(serialized);
  const editorRef = useRef<Editor>(null);

  useEffect(() => {
    const [path, value] = diffNewData(previous, serialized);
    console.log("got update", path, value);
    if (!value) {
      return;
    }

    editorRef.current?.jsonEditor.set(serialized);

    var node = editorRef.current?.jsonEditor.node as Node;
    path.forEach((element) => {
      node.childs?.forEach((child) => {
        if (child.field === element) {
          node = child;
        }
      });
    });

    node.dom.tree.style.background = "lime";

    setPrevious(serialized);
  }, [props.rerender]);

  const updateData = (target: any, path: string[]) => {
    props.realm.write(() => {
      var obj: Record<string, any> = props.object;
      for (let index = 0; index < path.length - 1; index++) {
        obj = obj[path[index]];
      }

      const field = path[path.length - 1];
      var value = target.value;
      if (obj[field] instanceof BSON.ObjectId) {
        value = new BSON.ObjectId(value);
        // TODO object id changes are actually not allowed by realm
      }
      obj[path[path.length - 1]] = value;
    });
  };

  const onChange = () => {
    const [target, path] = findEditorNodeByValueDom(
      editorRef.current?.jsonEditor.focusTarget,
      editorRef.current?.jsonEditor.node,
    );
    if (!target) {
      return;
    }
    target.dom.value.addEventListener(
      "focusout",
      () => {
        updateData(target, path);
      },
      { once: true },
    );
  };

  return (
    <>
      <Editor
        ref={editorRef}
        schema={undefined}
        value={serialized}
        history={false}
        statusBar={false}
        navigationBar={false}
        search={false}
        onChange={onChange}
      ></Editor>
    </>
  );
}

function findEditorNodeByValueDom(target: HTMLElement, node: Node): [Node | null, string[]] {
  if (!node || !target) {
    return [null, []];
  }
  if (node.dom.value === target) {
    return [node, []];
  }

  if (!node.childs) {
    return [null, []];
  }

  for (let index = 0; index < node.childs.length; index++) {
    const [found, path] = findEditorNodeByValueDom(target, node.childs[index]);
    if (found) {
      path.unshift(node.childs[index].field);
      return [found, path];
    }
  }

  return [null, []];
}
