echo "Creating an SSH key for you..."
ssh-keygen -t rsa

echo "Please add this public key to Github \n"
echo "https://github.com/account/ssh \n"
read -p "Press [Enter] key after this..."

echo "Installing xcode-stuff"
xcode-select --install

# Check for Homebrew,
# Install if we don't have it
if test ! $(which brew); then
  echo "Installing homebrew..."
  ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
fi

# Update homebrew recipes
echo "Updating homebrew..."
brew update

echo "Installing Git..."
brew install --appdir="~/Applications" git

echo "Git config"

git config --global user.name "Chris Young"
git config --global user.email chris.young@swimlane.com


echo "Installing brew git utilities..."
brew install --appdir="~/Applications" git-extras
brew install --appdir="~/Applications" legit
brew install --appdir="~/Applications" git-flow

echo "Installing other brew stuff..."
brew install --appdir="~/Applications" tree
brew install --appdir="~/Applications" wget
brew install --appdir="~/Applications" trash
brew install --appdir="~/Applications" mackup


#@TODO install our custom fonts and stuff

echo "Cleaning up brew"
brew cleanup

echo "Installing homebrew cask"
brew install --appdir="~/Applications" caskroom/cask/brew-cask

echo "Copying dotfiles from Github"
cd ~
git clone git@github.com:bradp/dotfiles.git .dotfiles
cd .dotfiles
sh symdotfiles

echo "Grunting it up"
npm install -g grunt-cli

#Install Zsh & Oh My Zsh
echo "Installing Oh My ZSH..."
curl -L http://install.ohmyz.sh | sh

echo "Setting up Oh My Zsh theme..."
cd  /Users/bradparbs/.oh-my-zsh/themes
curl https://gist.githubusercontent.com/bradp/a52fffd9cad1cd51edb7/raw/cb46de8e4c77beb7fad38c81dbddf531d9875c78/brad-muse.zsh-theme > brad-muse.zsh-theme

echo "Setting up Zsh plugins..."
cd ~/.oh-my-zsh/custom/plugins
git clone git://github.com/zsh-users/zsh-syntax-highlighting.git

echo "Setting ZSH as shell..."
chsh -s /bin/zsh

taps=(
    homebrew/services
    wata727/tflint
    azure/functions
    jakehilborn/jakehilborn
    ravenac95/sudolikeaboss
    isen-ng/dotnet-sdk-versions
)

# Apps
apps=(
    1password  
    afsctool
    apktool
    asdf
    augeas
    autoconf
    automake
    awscli
    azure-cli
    azure-functions-core-tools@3
    bartender
    bettertouchtool
    beyond-compare
    bitwarden
    bitwarden-cli
    certbot    
    charles
    cleanmymac   
    contexts 
    cornerstone
    dialog
    diffmerge
    displayplacer
    dive
    dnsmasq
    dotnet-sdk        
    figma
    firefox
    fontforge
    freetype
    fzf
    gas-mask
    gh
    git
    gitversion
    glib
    # google-chrome
    gradle
    graphite2
    harfbuzz    
    helm@3    
    icu4c
    imagemagick
    jesseduffield/lazygit/lazygit
    jetbrains-toolbox
    jpeg
    jq
    kubernetes-cli
    libevent
    libffi
    libgpg-error
    libksba
    libpng
    libsodium
    libtiff
    libtool
    libyaml
    licecap    
    makedepend
    mas
    mitmproxy
    mono
    ngrok
    nvm    
    oniguruma
    openssl@1.1
    p4v
    p7zip
    pango
    peco
    pixman
    pkg-config
    postman
    proctools
    protobuf
    pyenv
    pyenv-virtualenv
    qlmarkdown 
    rbenv
    readline
    reattach-to-user-namespace
    remake
    rename
    scons
    sequel-pro
    shellcheck
    skaffold
    snagit
    sourcetree
    sphinx-doc
    spotify
    sqlcipher
    sqlite
    sublime-text
    # sudolikeaboss
    suspicious-package
    swagger-codegen
    terraform
    textexpander
    tflint
    the_silver_searcher
    theharvester
    tmux
    transmission
    ttfautohint
    # vagrant
    # virtualbox
    vlc
    watch
    watchman
    xz
    yarn
    yq
    zeromq
    zerotier-one
    # zoomus
    # zsh
    zsh-syntax-highlighting
    zx
)

# Install apps to /Applications
# Default is: /Users/$user/Applications
echo "installing apps with Cask..."

for t in "${taps[@]}"
do
	brew tap "$t"
done

brew install --appdir="~/Applications" ${apps[@]}

brew cleanup
brew cleanup

echo "Restoring setup from Mackup..."
#mackup restore @TODO uncomment

echo "Setting some Mac settings..."

#"Disabling system-wide resume"
defaults write NSGlobalDomain NSQuitAlwaysKeepsWindows -bool false

#"Disabling automatic termination of inactive apps"
defaults write NSGlobalDomain NSDisableAutomaticTermination -bool true

#"Allow text selection in Quick Look"
defaults write com.apple.finder QLEnableTextSelection -bool TRUE

#"Disabling OS X Gate Keeper"
#"(You'll be able to install any app you want from here on, not just Mac App Store apps)"
# sudo spctl --master-disable
# sudo defaults write /var/db/SystemPolicy-prefs.plist enabled -string no
defaults write com.apple.LaunchServices LSQuarantine -bool false

#"Expanding the save panel by default"
defaults write NSGlobalDomain NSNavPanelExpandedStateForSaveMode -bool true
defaults write NSGlobalDomain PMPrintingExpandedStateForPrint -bool true
defaults write NSGlobalDomain PMPrintingExpandedStateForPrint2 -bool true

#"Automatically quit printer app once the print jobs complete"
defaults write com.apple.print.PrintingPrefs "Quit When Finished" -bool true

#"Saving to disk (not to iCloud) by default"
defaults write NSGlobalDomain NSDocumentSaveNewDocumentsToCloud -bool false

#"Check for software updates daily, not just once per week"
defaults write com.apple.SoftwareUpdate ScheduleFrequency -int 1

#"Disable smart quotes and smart dashes as they are annoying when typing code"
defaults write NSGlobalDomain NSAutomaticQuoteSubstitutionEnabled -bool false
defaults write NSGlobalDomain NSAutomaticDashSubstitutionEnabled -bool false

#"Enabling full keyboard access for all controls (e.g. enable Tab in modal dialogs)"
defaults write NSGlobalDomain AppleKeyboardUIMode -int 3

#"Disabling press-and-hold for keys in favor of a key repeat"
defaults write NSGlobalDomain ApplePressAndHoldEnabled -bool false

#"Setting trackpad & mouse speed to a reasonable number"
# defaults write -g com.apple.trackpad.scaling 2
# defaults write -g com.apple.mouse.scaling 2.5

#"Enabling subpixel font rendering on non-Apple LCDs"
defaults write NSGlobalDomain AppleFontSmoothing -int 2

#"Showing icons for hard drives, servers, and removable media on the desktop"
defaults write com.apple.finder ShowExternalHardDrivesOnDesktop -bool true

#"Showing all filename extensions in Finder by default"
defaults write NSGlobalDomain AppleShowAllExtensions -bool true

#"Disabling the warning when changing a file extension"
defaults write com.apple.finder FXEnableExtensionChangeWarning -bool false

#"Use column view in all Finder windows by default"
defaults write com.apple.finder FXPreferredViewStyle Clmv

#"Avoiding the creation of .DS_Store files on network volumes"
defaults write com.apple.desktopservices DSDontWriteNetworkStores -bool true

#"Setting the icon size of Dock items to 36 pixels for optimal size/screen-realestate"
defaults write com.apple.dock tilesize -int 36

#"Speeding up Mission Control animations and grouping windows by application"
defaults write com.apple.dock expose-animation-duration -float 0.1
defaults write com.apple.dock "expose-group-by-app" -bool true

#"Setting Dock to auto-hide and removing the auto-hiding delay"
defaults write com.apple.dock autohide -bool true
defaults write com.apple.dock autohide-delay -float 0
defaults write com.apple.dock autohide-time-modifier -float 0

#"Setting email addresses to copy as 'foo@example.com' instead of 'Foo Bar <foo@example.com>' in Mail.app"
defaults write com.apple.mail AddressesIncludeNameOnPasteboard -bool false

#"Enabling UTF-8 ONLY in Terminal.app and setting the Pro theme by default"
defaults write com.apple.terminal StringEncodings -array 4
defaults write com.apple.Terminal "Default Window Settings" -string "Pro"
defaults write com.apple.Terminal "Startup Window Settings" -string "Pro"


killall Finder


echo "Done!"

#@TODO install vagrant and sites folder