#!/bin/bash

# - creates or updates symlinks from `$OK/dotfiles` to `$HOME`

########################################################################
# ONLY USE IF YOU WANT TO SOURCE AND LINK YOUR DOTFILES
########################################################################

(
  cd dotfiles

  ln -sf "$PWD/asdf/asdfrc" "$HOME/.asdfrc"
  ln -sf "$PWD/asdf/tool-versions" "$HOME/.tool-versions"
  
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

)

if ! command -v go >/dev/null; then
  if ! go version | grep -Fq "1.11"; then
    curl https://dl.google.com/go/go1.11.darwin-amd64.tar.gz | sudo tar xz -C /usr/local
  fi
fi
