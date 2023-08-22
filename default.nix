{ pkgs ? import <nixpkgs> { }, ... }:

let
  packages = with pkgs; [
    elmPackages.elm
    elmPackages.create-elm-app
    elmPackages.elm-format
    elmPackages.elm-language-server
    nodejs-18_x
    yarn
  ];
in
pkgs.stdenv.mkDerivation {
  name = "esbuild-plugin-elm";
  buildInputs = packages;
}
