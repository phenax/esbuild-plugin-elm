import { Elm } from './elm/src/Main.elm';

const $root = document.createElement('div');
document.body.appendChild($root);

Elm.Main.init({
  node: $root
});

