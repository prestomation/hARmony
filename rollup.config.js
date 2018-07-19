import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';

export default [{
  input: 'src/main.js',
  output: {
    name: 'window',
    file: pkg.main,
    format: 'umd',
    extend: true
  },
  plugins: [
    resolve(),
    commonjs()
  ]
}];