{
  description = "Headless Hunter: The AI-Powered Reverse Recruiter";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
        {
          devShells.default = pkgs.mkShell {
            buildInputs = with pkgs; [
              bun
              chromium

              curl
            ];

            shellHook = ''
           echo "Headless Hunter Dev Environment"
           echo "Runtime: Bun v$(bun --version)"

           export PUPPETEER_EXECUTABLE_PATH="${pkgs.chromium}/bin/chromium"
           export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

            if systemctl is-active --quiet ollama; then
                echo "Ollama Service: UP"
            else
                echo "Ollama Service: DOWN (run 'systemctl start ollama')"
            fi
          '';
          };
        }
    );
}