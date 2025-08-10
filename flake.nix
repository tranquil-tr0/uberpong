{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    fenix = {
      url = "github:nix-community/fenix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = {
    self,
    nixpkgs,
    fenix,
  } @ inputs: let
    system = "x86_64-linux";
    overlays = [(fenix.overlays.default)];
    pkgs = import nixpkgs {inherit system overlays;};
    lib = pkgs.lib;

    rustToolchain = pkgs.fenix.stable.toolchain;
  in {
    devShells.${system}.default = pkgs.mkShell {
      buildInputs = with pkgs; [alejandra rustToolchain nodejs pnpm];
      RUST_SRC_PATH = "${rustToolchain}/lib/rustlib/src/rust/src";
    };
  };
}
