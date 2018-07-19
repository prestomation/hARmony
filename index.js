(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.window = global.window || {})));
}(this, (function (exports) { 'use strict';

	const foo = "bar";
	const spam = "eggs";

	exports.foo = foo;
	exports.spam = spam;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
