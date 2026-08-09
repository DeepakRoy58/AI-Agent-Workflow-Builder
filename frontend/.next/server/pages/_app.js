"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/_app";
exports.ids = ["pages/_app"];
exports.modules = {

/***/ "./lib/nhost.ts":
/*!**********************!*\
  !*** ./lib/nhost.ts ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   nhost: () => (/* binding */ nhost)\n/* harmony export */ });\n/* harmony import */ var _nhost_nhost_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @nhost/nhost-js */ \"@nhost/nhost-js\");\n/* harmony import */ var _nhost_nhost_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_nhost_nhost_js__WEBPACK_IMPORTED_MODULE_0__);\n\nconst nhostConfig = {\n    authUrl: process.env.NEXT_PUBLIC_NHOST_AUTH_URL,\n    graphqlUrl: process.env.NEXT_PUBLIC_NHOST_GRAPHQL_URL,\n    storageUrl: process.env.NEXT_PUBLIC_NHOST_STORAGE_URL,\n    functionsUrl: process.env.NEXT_PUBLIC_NHOST_FUNCTIONS_URL,\n    subdomain: \"apaxlnsthefvcqwcrhof\",\n    region: \"ap-south-1\"\n};\nconst filteredConfig = Object.fromEntries(Object.entries(nhostConfig).filter(([, value])=>typeof value === \"string\" && value.length > 0));\nconst nhost = new _nhost_nhost_js__WEBPACK_IMPORTED_MODULE_0__.NhostClient(filteredConfig);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9saWIvbmhvc3QudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQThDO0FBRTlDLE1BQU1DLGNBQWM7SUFDbEJDLFNBQVNDLFFBQVFDLEdBQUcsQ0FBQ0MsMEJBQTBCO0lBQy9DQyxZQUFZSCxRQUFRQyxHQUFHLENBQUNHLDZCQUE2QjtJQUNyREMsWUFBWUwsUUFBUUMsR0FBRyxDQUFDSyw2QkFBNkI7SUFDckRDLGNBQWNQLFFBQVFDLEdBQUcsQ0FBQ08sK0JBQStCO0lBQ3pEQyxXQUFXVCxzQkFBdUM7SUFDbERXLFFBQVFYLFlBQW9DO0FBQzlDO0FBRUEsTUFBTWEsaUJBQWlCQyxPQUFPQyxXQUFXLENBQ3ZDRCxPQUFPRSxPQUFPLENBQUNsQixhQUFhbUIsTUFBTSxDQUFDLENBQUMsR0FBR0MsTUFBTSxHQUFLLE9BQU9BLFVBQVUsWUFBWUEsTUFBTUMsTUFBTSxHQUFHO0FBR3pGLE1BQU1DLFFBQVEsSUFBSXZCLHdEQUFXQSxDQUFDZ0IsZ0JBQTBDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vYWktYWdlbnQtd29ya2Zsb3ctYnVpbGRlci1mcm9udGVuZC8uL2xpYi9uaG9zdC50cz80Yjg1Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5ob3N0Q2xpZW50IH0gZnJvbSBcIkBuaG9zdC9uaG9zdC1qc1wiO1xuXG5jb25zdCBuaG9zdENvbmZpZyA9IHtcbiAgYXV0aFVybDogcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfTkhPU1RfQVVUSF9VUkwsXG4gIGdyYXBocWxVcmw6IHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX05IT1NUX0dSQVBIUUxfVVJMLFxuICBzdG9yYWdlVXJsOiBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19OSE9TVF9TVE9SQUdFX1VSTCxcbiAgZnVuY3Rpb25zVXJsOiBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19OSE9TVF9GVU5DVElPTlNfVVJMLFxuICBzdWJkb21haW46IHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX05IT1NUX1NVQkRPTUFJTixcbiAgcmVnaW9uOiBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19OSE9TVF9SRUdJT04sXG59O1xuXG5jb25zdCBmaWx0ZXJlZENvbmZpZyA9IE9iamVjdC5mcm9tRW50cmllcyhcbiAgT2JqZWN0LmVudHJpZXMobmhvc3RDb25maWcpLmZpbHRlcigoWywgdmFsdWVdKSA9PiB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgJiYgdmFsdWUubGVuZ3RoID4gMClcbik7XG5cbmV4cG9ydCBjb25zdCBuaG9zdCA9IG5ldyBOaG9zdENsaWVudChmaWx0ZXJlZENvbmZpZyBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KTtcbiJdLCJuYW1lcyI6WyJOaG9zdENsaWVudCIsIm5ob3N0Q29uZmlnIiwiYXV0aFVybCIsInByb2Nlc3MiLCJlbnYiLCJORVhUX1BVQkxJQ19OSE9TVF9BVVRIX1VSTCIsImdyYXBocWxVcmwiLCJORVhUX1BVQkxJQ19OSE9TVF9HUkFQSFFMX1VSTCIsInN0b3JhZ2VVcmwiLCJORVhUX1BVQkxJQ19OSE9TVF9TVE9SQUdFX1VSTCIsImZ1bmN0aW9uc1VybCIsIk5FWFRfUFVCTElDX05IT1NUX0ZVTkNUSU9OU19VUkwiLCJzdWJkb21haW4iLCJORVhUX1BVQkxJQ19OSE9TVF9TVUJET01BSU4iLCJyZWdpb24iLCJORVhUX1BVQkxJQ19OSE9TVF9SRUdJT04iLCJmaWx0ZXJlZENvbmZpZyIsIk9iamVjdCIsImZyb21FbnRyaWVzIiwiZW50cmllcyIsImZpbHRlciIsInZhbHVlIiwibGVuZ3RoIiwibmhvc3QiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./lib/nhost.ts\n");

/***/ }),

/***/ "./pages/_app.tsx":
/*!************************!*\
  !*** ./pages/_app.tsx ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ App)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _nhost_react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @nhost/react */ \"@nhost/react\");\n/* harmony import */ var _nhost_react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_nhost_react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _lib_nhost__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/nhost */ \"./lib/nhost.ts\");\n\n\n\nfunction App({ Component, pageProps }) {\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_nhost_react__WEBPACK_IMPORTED_MODULE_1__.NhostProvider, {\n        nhost: _lib_nhost__WEBPACK_IMPORTED_MODULE_2__.nhost,\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n            ...pageProps\n        }, void 0, false, {\n            fileName: \"/home/deepakroy/app/project/frontend/pages/_app.tsx\",\n            lineNumber: 8,\n            columnNumber: 7\n        }, this)\n    }, void 0, false, {\n        fileName: \"/home/deepakroy/app/project/frontend/pages/_app.tsx\",\n        lineNumber: 7,\n        columnNumber: 5\n    }, this);\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9wYWdlcy9fYXBwLnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQzZDO0FBQ1I7QUFFdEIsU0FBU0UsSUFBSSxFQUFFQyxTQUFTLEVBQUVDLFNBQVMsRUFBWTtJQUM1RCxxQkFDRSw4REFBQ0osdURBQWFBO1FBQUNDLE9BQU9BLDZDQUFLQTtrQkFDekIsNEVBQUNFO1lBQVcsR0FBR0MsU0FBUzs7Ozs7Ozs7Ozs7QUFHOUIiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9haS1hZ2VudC13b3JrZmxvdy1idWlsZGVyLWZyb250ZW5kLy4vcGFnZXMvX2FwcC50c3g/MmZiZSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdHlwZSB7IEFwcFByb3BzIH0gZnJvbSBcIm5leHQvYXBwXCI7XG5pbXBvcnQgeyBOaG9zdFByb3ZpZGVyIH0gZnJvbSBcIkBuaG9zdC9yZWFjdFwiO1xuaW1wb3J0IHsgbmhvc3QgfSBmcm9tIFwiLi4vbGliL25ob3N0XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEFwcCh7IENvbXBvbmVudCwgcGFnZVByb3BzIH06IEFwcFByb3BzKSB7XG4gIHJldHVybiAoXG4gICAgPE5ob3N0UHJvdmlkZXIgbmhvc3Q9e25ob3N0fT5cbiAgICAgIDxDb21wb25lbnQgey4uLnBhZ2VQcm9wc30gLz5cbiAgICA8L05ob3N0UHJvdmlkZXI+XG4gICk7XG59XG4iXSwibmFtZXMiOlsiTmhvc3RQcm92aWRlciIsIm5ob3N0IiwiQXBwIiwiQ29tcG9uZW50IiwicGFnZVByb3BzIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./pages/_app.tsx\n");

/***/ }),

/***/ "@nhost/nhost-js":
/*!**********************************!*\
  !*** external "@nhost/nhost-js" ***!
  \**********************************/
/***/ ((module) => {

module.exports = require("@nhost/nhost-js");

/***/ }),

/***/ "@nhost/react":
/*!*******************************!*\
  !*** external "@nhost/react" ***!
  \*******************************/
/***/ ((module) => {

module.exports = require("@nhost/react");

/***/ }),

/***/ "react/jsx-dev-runtime":
/*!****************************************!*\
  !*** external "react/jsx-dev-runtime" ***!
  \****************************************/
/***/ ((module) => {

module.exports = require("react/jsx-dev-runtime");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("./pages/_app.tsx"));
module.exports = __webpack_exports__;

})();