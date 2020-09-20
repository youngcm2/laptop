#!/bin/bash

# This script can be run safely multiple times.
# It's tested on macOS High Sierra (10.13). It:
# - installs, upgrades, or skips system packages
# - creates or updates symlinks from `$OK/dotfiles` to `$HOME`
# - installs or updates programming languages such as Ruby, Node, and Go

set -ex

HOMEBREW_PREFIX="/usr/local"

if [ -d "$HOMEBREW_PREFIX" ]; then
  if ! [ -r "$HOMEBREW_PREFIX" ]; then
    sudo chown -R "$LOGNAME:admin" "$HOMEBREW_PREFIX"
  fi
else
  sudo mkdir "$HOMEBREW_PREFIX"
  sudo chflags norestricted "$HOMEBREW_PREFIX"
  sudo chown -R "$LOGNAME:admin" "$HOMEBREW_PREFIX"
fi

update_shell() {
  local shell_path;
  shell_path="$(which zsh)"

  if ! grep "$shell_path" /etc/shells > /dev/null 2>&1 ; then
    sudo sh -c "echo $shell_path >> /etc/shells"
  fi
  chsh -s "$shell_path"
}

case "$SHELL" in
  */zsh)
    if [ "$(which zsh)" != "$HOMEBREW_PREFIX/bin/zsh" ] ; then
      update_shell
    fi
    ;;
  *)
    update_shell
    ;;
esac

if ! command -v brew >/dev/null; then
  curl -fsS \
    'https://raw.githubusercontent.com/Homebrew/install/master/install' | ruby
  export PATH="/usr/local/bin:$PATH"
fi

brew update
brew bundle --file=./Brewfile

brew upgrade
brew cleanup

# (
#   cd dotfiles

#   ln -sf "$PWD/asdf/asdfrc" "$HOME/.asdfrc"
#   ln -sf "$PWD/asdf/tool-versions" "$HOME/.tool-versions"
  
#   mkdir -p "$HOME/.git_template/hooks"
#   (
#     cd git/git_template
#     for f in hooks/*; do
#       ln -sf "$PWD/$f" "$HOME/.git_template/$f"
#     done
#   )

#   ln -sf "$PWD/git/gitconfig" "$HOME/.gitconfig"
#   ln -sf "$PWD/git/gitignore" "$HOME/.gitignore"
#   ln -sf "$PWD/git/gitmessage" "$HOME/.gitmessage"

#   mkdir -p "$HOME/.bundle"
#   ln -sf "$PWD/ruby/bundle/config" "$HOME/.bundle/config"
#   ln -sf "$PWD/ruby/gemrc" "$HOME/.gemrc"
#   ln -sf "$PWD/ruby/rspec" "$HOME/.rspec"

#   ln -sf "$PWD/search/ctags" "$HOME/.ctags"

#   ln -sf "$PWD/shell/curlrc" "$HOME/.curlrc"
#   ln -sf "$PWD/shell/hushlogin" "$HOME/.hushlogin"
#   mkdir -p "$HOME/.ssh"
#   ln -sf "$PWD/shell/ssh" "$HOME/.ssh/config"
#   ln -sf "$PWD/shell/tmux.conf" "$HOME/.tmux.conf"
#   ln -sf "$PWD/shell/zshrc" "$HOME/.zshrc"

# )

# if ! command -v go >/dev/null; then
#   if ! go version | grep -Fq "1.11"; then
#     curl https://dl.google.com/go/go1.11.darwin-amd64.tar.gz | sudo tar xz -C /usr/local
#   fi
# fi

# if [ -d "$HOME/.asdf" ]; then
#   (
#     cd "$HOME/.asdf"
#     git fetch origin
#     git reset --hard origin/master
#   )
# else
#   git clone https://github.com/asdf-vm/asdf.git "$HOME/.asdf"
# fi

# asdf_plugin_update() {
#   if ! asdf plugin-list | grep -Fq "$1"; then
#     asdf plugin-add "$1" "$2"
#   fi

#   asdf plugin-update "$1"
# }

# asdf_plugin_update "java" "https://github.com/skotchpine/asdf-java"
# asdf install java

# asdf_plugin_update "maven" "https://github.com/skotchpine/asdf-maven"
# asdf install maven

# asdf_plugin_update "nodejs" "https://github.com/asdf-vm/asdf-nodejs"
# export NODEJS_CHECK_SIGNATURES=no
# asdf install nodejs
# npm config set scripts-prepend-node-path true

# asdf_plugin_update "python" "https://github.com/tuvistavie/asdf-python.git"
# asdf install python

# asdf_plugin_update "ruby" "https://github.com/asdf-vm/asdf-ruby"
# asdf install ruby

# asdf_plugin_update "dotnet-core" "https://github.com/emersonsoares/asdf-dotnet-core.git"
# asdf install dotnet-core