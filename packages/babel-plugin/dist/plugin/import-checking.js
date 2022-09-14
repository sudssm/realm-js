"use strict";
////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPropertyImportedFromRealm = exports.isImportedFromRealm = void 0;
// TODO: Merge the functions below into the functions above
function isImportedFromRealm(path) {
    if (path.isMemberExpression()) {
        return isImportedFromRealm(path.get("object"));
    }
    else if (path.isTSQualifiedName()) {
        return isImportedFromRealm(path.get("left"));
    }
    else if (path.isIdentifier()) {
        const binding = path.scope.getBinding(path.node.name);
        if (binding && binding.path.parentPath && binding.path.parentPath.isImportDeclaration()) {
            return binding.path.parentPath.get("source").isStringLiteral({ value: "realm" });
        }
    }
    return false;
}
exports.isImportedFromRealm = isImportedFromRealm;
function isPropertyImportedFromRealm(path, name) {
    if (path.isMemberExpression()) {
        return isImportedFromRealm(path.get("object")) && path.get("property").isIdentifier({ name });
    }
    return false;
}
exports.isPropertyImportedFromRealm = isPropertyImportedFromRealm;
