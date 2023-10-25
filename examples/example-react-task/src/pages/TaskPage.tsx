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
import "../styles/static.css";
import React, { useEffect, useRef, useState } from "react";
import { Node } from "jsoneditor";
import Creatable from "react-select/creatable";

/**
 * Displays the list of tasks as well as buttons for performing
 * sync-related operations.
 */
export function TaskPage(props: { realm: Realm; tables: string[]; rerender: number }) {
  const datas = props.tables.map(function (table) {
    return (
      <div key={table}>
        <TableView realm={props.realm} table={table} rerender={props.rerender} />
      </div>
    );
  });

  return <div className={styles.container}>{datas}</div>;
}

function TableView(props: { realm: Realm; table: string; rerender: number }) {
  const realm = props.realm;
  const [query, setQuery] = useState("truepredicate");
  const [filter, setFilter] = useState("truepredicate");
  const [objects, setObjects] = useState<any>();
  const [sort, setSort] = useState("");
  const [sortDir, setSortDir] = useState(false);
  const [limit, setLimit] = useState(10); // for view
  const [storedLimit, setStoredLimit] = useState(limit); // for use
  const [error, setError] = useState("");

  const updateQuery = async (query: string, filter: string, limit: number, sort: string) => {
    setError("");
    if (!query) {
      query = "truepredicate";
      setQuery(query);
    }
    if (!filter) {
      filter = "truepredicate";
      setFilter(filter);
    }
    if (!limit) {
      limit = 10;
      setLimit(10);
    }
    setStoredLimit(limit);

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

  function updateIfEnter(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      updateQuery(query, filter, limit, sort);
    }
  }

  useEffect(() => {
    updateQuery(query, filter, limit, sort);
  }, []);

  if (!objects) {
    return <></>;
  }

  const fieldSet = new Set();

  let results = objects as Realm.Results<Realm.Object>;
  if (sort) {
    results = results.sorted(sort, sortDir);
  }

  const objectsDom = results.slice(0, storedLimit).map(function (object) {
    const json = object.toJSON();
    const key = object._objectKey();
    Object.keys(object).forEach((field) => {
      if (typeof json[field] == "object" && !(json[field] instanceof BSON.ObjectId)) {
        return;
      }
      fieldSet.add(field);
    });
    return (
      <div key={key} style={{ paddingBottom: 15 }}>
        <ObjectView realm={props.realm} object={object} rerender={props.rerender} />
      </div>
    );
  });

  const sortOptions = [...fieldSet].map(function (field) {
    return {
      value: field,
      label: field,
    };
  });

  const count = (objects as Realm.Results<Realm.Object>).length;

  return (
    <>
      <h1>
        {props.table} ({count})
      </h1>
      <div className="input-group">
        <label>Query</label>
        <input
          className={styles.input}
          style={{ fontFamily: "monospace" }}
          type="text"
          placeholder="truepredicate"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyUp={updateIfEnter}
        />
        <label>Filter</label>
        <input
          className={styles.input}
          style={{ fontFamily: "monospace" }}
          type="text"
          placeholder="truepredicate"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyUp={updateIfEnter}
        />
        <p />
        <label>Limit</label>
        <input
          className={styles.input}
          type="text"
          placeholder="10"
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
          onKeyUp={updateIfEnter}
        />
        <label>Sort</label>
        <Creatable
          className={styles.sort}
          options={sortOptions}
          onChange={(value) => {
            setSort((value?.value as string) || "");
          }}
        />
        <i
          className={styles.arrow + " " + (sortDir ? styles.down : styles.up)}
          onClick={() => {
            setSortDir(!sortDir);
          }}
        />

        <div className={styles.buttons}>
          <button
            className={styles.button}
            onClick={(e) => {
              e.preventDefault();
              updateQuery(query, filter, limit, sort);
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

function diffNewData(previous: Record<string, any>, update: Record<string, any>): [string[], any][] {
  const diffs: [string[], any][] = [];
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
      const results = diffNewData(v, previous[k]);
      if (!results.length) {
        continue;
      }

      results.forEach(([path, value]) => {
        path.unshift(k);
      });

      diffs.concat(results);
    }

    diffs.push([[k], v]);
  }
  return diffs;
}

function ObjectView(props: { realm: Realm; object: Realm.Object; rerender: number }) {
  const serialized = serializeForView(props.object);
  const [previous, setPrevious] = useState(serialized);
  const editorRef = useRef<Editor>(null);

  useEffect(() => {
    editorRef.current?.jsonEditor.update(serialized);
    setPrevious(serialized);

    const diffs = diffNewData(previous, serialized);
    if (!diffs.length) {
      return;
    }

    diffs.forEach(([path, value]) => {
      var node = editorRef.current?.jsonEditor.node as Node;
      path.forEach((element) => {
        node.childs?.forEach((child) => {
          if (child.field === element) {
            node = child;
          }
        });
      });

      node.dom.tree.classList.add(styles.highlight);
      setTimeout(() => {
        node.dom.tree.classList.remove(styles.highlight);
      }, 10);
    });
  }, [props.rerender]);

  const updateData = (value: any, path: string[]) => {
    props.realm.write(() => {
      var obj: Record<string, any> = props.object;
      for (let index = 0; index < path.length - 1; index++) {
        obj = obj[path[index]];
      }

      const field = path[path.length - 1];
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
      // could not find a target based on dom; diff the data instead
      const diff = diffNewData(serialized, editorRef.current?.jsonEditor.get());
      diff.forEach(([path, value]) => {
        updateData(value, path);
      });
      return;
    }

    target.dom.value.addEventListener(
      "focusout",
      () => {
        updateData(target.value, path);
      },
      { once: true },
    );
    target.dom.value.addEventListener(
      "keydown",
      (e) => {
        if (e.key !== "Enter") {
          return;
        }
        e.stopImmediatePropagation();
        e.stopPropagation();
        e.preventDefault();
        target.dom.value.blur();
        return false;
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
