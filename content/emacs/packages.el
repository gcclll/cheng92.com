(package! spacemacs-theme)

;; File and directory management
(package! crux)
(package! deft)
;; (package! ranger)
(package! autoinsert)

;; Tools
;; TODO mu4e
(package! zoom)
(package! youdao-dictionary)
(package! popper
  :recipe (:host github :repo "waymondo/popper") :disable t)
(package! engine-mode)
(package! emacs-everywhere)
(package! counsel-osx-app)
(package! dash-at-point
  :recipe (:host github
           :repo "waymondo/dash-at-point"))
;; (package! impatient-mode)

;; search
(package! deadgrep)
(package! visual-regexp)
(package! visual-regexp-steriods
  :recipe (:host github :repo "benma/visual-regexp-steroids.el"))
;; (package! color-rg :recipe (:host github :repo "manateelazycat/color-rg"))
;; (package! exec-path-from-shell)

;; Text
(package! pangu-spacing)
(package! move-text)
(package! string-inflection)
(package! parrot)
(package! cycle-quotes)
(package! visual-fill-column)
(package! maple-iedit
  :recipe (:host github
           :repo "honmaple/emacs-maple-iedit"))
(package! zzz-to-char)
(package! tiny)
(package! evil-nerd-commenter)
(package! mixed-pitch)

;; org
(unpin! code-review)
(unpin! org-roam)
(package! org-appear)
(package! org-fancy-priorities)
(package! org-ol-tree
  :recipe (:host github :repo "Townk/org-ol-tree"))
(package! org-fragtog)
(package! org-roam-ui)

;; study & gaming
(package! leetcode)
(package! dotenv-mode)
(package! prettier-js)
(package! ob-typescript)

;; programming
(package! js-doc)
(package! mmm-mode)
;; TODO dap-mode

;; Disable
(disable-packages! bookmark tide eldoc grip-mode)
