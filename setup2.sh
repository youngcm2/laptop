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
    certbot    
    cleanmymac    
    cornerstone
    dialog
    diffmerge
    displayplacer
    dnsmasq
    docker-completion
    docker-compose
    docker-compose-completion
    dropbox    
    firefox
    fontforge
    freetype
    fzf
    gh
    git
    gitversion
    glib
    google-chrome
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
    mono
    nvm    
    oniguruma
    openssl@1.1
    p7zip
    pango
    peco
    pixman
    pkg-config
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
    zeromq
    # zoomus
    # zsh
    zsh-syntax-highlighting
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
defaults write -g com.apple.trackpad.scaling 2
defaults write -g com.apple.mouse.scaling 2.5

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