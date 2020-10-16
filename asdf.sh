#!/bin/bash

# - installs or updates programming languages such as Ruby, Node, and Go

if [ -d "$HOME/.asdf" ]; then
  (
    cd "$HOME/.asdf"
    git fetch origin
    git reset --hard origin/master
  )
else
  git clone https://github.com/asdf-vm/asdf.git "$HOME/.asdf"
fi

asdf_plugin_update() {
  if ! asdf plugin-list | grep -Fq "$1"; then
    asdf plugin-add "$1" "$2"
  fi

  asdf plugin-update "$1"
}

asdf_plugin_update "java" "https://github.com/skotchpine/asdf-java"
asdf install java latest

asdf_plugin_update "maven" "https://github.com/skotchpine/asdf-maven"
asdf install maven latest

asdf_plugin_update "nodejs" "https://github.com/asdf-vm/asdf-nodejs"
export NODEJS_CHECK_SIGNATURES=no
asdf install nodejs latest
npm config set scripts-prepend-node-path true

asdf_plugin_update "python" "https://github.com/tuvistavie/asdf-python.git"
asdf install python latest

asdf_plugin_update "ruby" "https://github.com/asdf-vm/asdf-ruby"
asdf install ruby latest

asdf_plugin_update "dotnet-core" "https://github.com/emersonsoares/asdf-dotnet-core.git"
asdf install dotnet-core latest