{
  description = "Arpeggio – agentic IDE for multi-agent orchestration";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };

        electronLibs = with pkgs; [
          nss
          nspr
          atk
          cups
          dbus
          expat
          libdrm
          libx11
          libxcomposite
          libxdamage
          libxext
          libxfixes
          libxrandr
          libxcb
          libxshmfence
          mesa
          libgbm
          gtk3
          pango
          cairo
          glib
          gdk-pixbuf
          alsa-lib
          at-spi2-atk
          at-spi2-core
        ];
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            pnpm
            gsettings-desktop-schemas
          ] ++ electronLibs;

          LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath electronLibs;

          GSETTINGS_SCHEMA_DIR = "${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}/glib-2.0/schemas";

          shellHook = ''
            export XDG_DATA_DIRS="${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:$XDG_DATA_DIRS"
            echo "Arpeggio dev shell ready — run 'pnpm dev' to start"
          '';
        };
      }
    );
}
