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
brew bundle --file=- <<EOF
tap "homebrew/services"
tap "wata727/tflint"

brew "afsctool"
brew "apktool"
brew "augeas"
brew "autoconf"
brew "automake"
brew "awscli"
brew "azure-cli"
brew "azure-functions-core-tools"
brew "certbot"
brew "dialog"
brew "dnsmasq"
brew "draft"
brew "fontforge"
brew "freetype"
brew "fribidi"
brew "fzf"
brew "gettext"
brew "git"
brew "git-flow-avh"
brew "gitversion"
brew "glib"
brew "gradle"
brew "graphite2"
brew "harfbuzz"
brew "heroku"
brew "hub"
brew "icu4c"
brew "imagemagick"
brew "jpeg"
brew "jq"
brew "kubernetes-cli"
brew "kubernetes-helm"
brew "libevent"
brew "libffi"
brew "libgpg-error"
brew "libksba"
brew "libpng"
brew "libsodium"
brew "libtiff"
brew "libtool"
brew "libyaml"
brew "makedepend"
brew "makeicon"
brew "mono"
brew "node"
brew "nvm"
brew "oniguruma"
brew "openssl"
brew "pango"
brew "peco"
brew "pixman"
brew "pkg-config"
brew "protobuf"
brew "python"
brew "python3"
brew "python@2"
brew "readline"
brew "reattach-to-user-namespace"
brew "rename"
brew "ruby"
brew "scons"
brew "shellcheck"
brew "sphinx-doc"
brew "sqlcipher"
brew "sqlite"
brew "sstp-client"
brew "swagger-codegen"
brew "tflint"
brew "the_silver_searcher"
brew "tmux"
brew "ttfautohint"
brew "universal-ctags", args: ["HEAD"]
brew "vim", args: ["without-ruby"]
brew "vsts-cli"
brew "watch"
brew "watchman"
brew "xz"
brew "yarn"
brew "zeromq"
brew "zsh"
brew "zsh-syntax-highlighting"

cask "alfred"
cask "android-file-transfer"
cask "android-sdk"
cask "android-studio"
cask "anki"
cask "anonymousvpn"
cask "appcleaner"
cask "applepi-baker"
cask "arduino"
cask "atom"
cask "aws-vault"
cask "balsamiq-mockups"
cask "bartender"
cask "beamer"
cask "beyond-compare"
cask "caffeine"
cask "captin"
cask "charles"
cask "colorsnapper"
cask "cyberduck"
cask "cyberghost"
cask "docker"
cask "docker-toolbox"
cask "dotnet-sdk"
cask "drawio"
cask "evernote"
cask "expo-xde"
cask "fastscripts"
cask "gas-mask"
cask "geekbench"
cask "gfxcardstatus"
cask "glyphs"
cask "google-chrome"
cask "handbrake"
cask "harvest"
cask "homebrew/cask-versions/google-chrome-canary"
cask "imazing"
cask "iterm2"
cask "java"
cask "jetbrains-toolbox"
cask "jing"
cask "kap"
cask "karabiner-elements"
cask "kindle"
cask "kitematic"
cask "macdown"
cask "macpar-deluxe"
cask "manageengine-mibbrowser"
cask "microsoft-azure-storage-explorer"
cask "mongodb-compass"
cask "ngrok"
cask "nordvpn"
cask "onedrive"
cask "paw"
cask "paw"
cask "postman"
cask "powershell"
cask "provisionql"
cask "rescuetime"
cask "skype"
cask "sourcetree"
cask "speedcrunch"
cask "spotify"
cask "sql-operations-studio"
cask "studio-3t"
cask "sublime-text"
cask "teamviewer"
cask "the-unarchiver"
cask "tunnelblick"
cask "visual-studio"
cask "visual-studio-code"
cask "vlc"
cask "vuescan"
cask "wireshark"
cask "zoomus"

EOF

brew upgrade
brew cleanup

(
  cd dotfiles

  ln -sf "$PWD/asdf/asdfrc" "$HOME/.asdfrc"
  ln -sf "$PWD/asdf/tool-versions" "$HOME/.tool-versions"

  ln -sf "$PWD/editor/vimrc" "$HOME/.vimrc"

  mkdir -p "$HOME/.vim/ftdetect"
  mkdir -p "$HOME/.vim/ftplugin"
  (
    cd editor/vim
    for f in {ftdetect,ftplugin}/*; do
      ln -sf "$PWD/$f" "$HOME/.vim/$f"
    done
  )

  mkdir -p "$HOME/.git_template/hooks"
  (
    cd git/git_template
    for f in hooks/*; do
      ln -sf "$PWD/$f" "$HOME/.git_template/$f"
    done
  )

  ln -sf "$PWD/git/gitconfig" "$HOME/.gitconfig"
  ln -sf "$PWD/git/gitignore" "$HOME/.gitignore"
  ln -sf "$PWD/git/gitmessage" "$HOME/.gitmessage"

  mkdir -p "$HOME/.bundle"
  ln -sf "$PWD/ruby/bundle/config" "$HOME/.bundle/config"
  ln -sf "$PWD/ruby/gemrc" "$HOME/.gemrc"
  ln -sf "$PWD/ruby/rspec" "$HOME/.rspec"

  ln -sf "$PWD/search/ctags" "$HOME/.ctags"

  ln -sf "$PWD/shell/curlrc" "$HOME/.curlrc"
  ln -sf "$PWD/shell/hushlogin" "$HOME/.hushlogin"
  mkdir -p "$HOME/.ssh"
  ln -sf "$PWD/shell/ssh" "$HOME/.ssh/config"
  ln -sf "$PWD/shell/tmux.conf" "$HOME/.tmux.conf"
  ln -sf "$PWD/shell/zshrc" "$HOME/.zshrc"

  ln -sf "$PWD/sql/psqlrc" "$HOME/.psqlrc"
)

if [ -e "$HOME/.vim/autoload/plug.vim" ]; then
  vim -u "$HOME/.vimrc" +PlugUpgrade +qa
else
  curl -fLo "$HOME/.vim/autoload/plug.vim" --create-dirs \
    https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
fi
vim -u "$HOME/.vimrc" +PlugUpdate +PlugClean! +qa

if ! command -v go >/dev/null; then
  if ! go version | grep -Fq "1.11"; then
    curl https://dl.google.com/go/go1.11.darwin-amd64.tar.gz | sudo tar xz -C /usr/local
  fi
fi

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
asdf install java 8.172
asdf install java 10.0.1

asdf_plugin_update "maven" "https://github.com/skotchpine/asdf-maven"
asdf install maven 3.3.9

asdf_plugin_update "nodejs" "https://github.com/asdf-vm/asdf-nodejs"
export NODEJS_CHECK_SIGNATURES=no
asdf install nodejs 8.9.0
asdf reshim nodejs
npm config set scripts-prepend-node-path true

asdf_plugin_update "python" "https://github.com/tuvistavie/asdf-python.git"
asdf install python 3.6.5

asdf_plugin_update "ruby" "https://github.com/asdf-vm/asdf-ruby"
asdf install ruby 2.4.2
asdf install ruby 2.5.1
