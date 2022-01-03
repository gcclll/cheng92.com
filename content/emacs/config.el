;;;###autoload
(defun gcl/edit-zsh-configuration ()
  (interactive)
  (find-file "~/.zshrc"))

;;;###autoload
(defun gcl/use-eslint-from-node-modules ()
    "Set local eslint if available."
    (let* ((root (locate-dominating-file
                  (or (buffer-file-name) default-directory)
                  "node_modules"))
           (eslint (and root
                        (expand-file-name "node_modules/eslint/bin/eslint.js"
                                          root))))
      (when (and eslint (file-executable-p eslint))
        (setq-local flycheck-javascript-eslint-executable eslint))))

;;;###autoload
(defun gcl/goto-match-paren (arg)
  "Go to the matching if on (){}[], similar to vi style of % ."
  (interactive "p")
  (cond ((looking-at "[\[\(\{]") (evil-jump-item))
        ((looking-back "[\]\)\}]" 1) (evil-jump-item))
        ((looking-at "[\]\)\}]") (forward-char) (evil-jump-item))
        ((looking-back "[\[\(\{]" 1) (backward-char) (evil-jump-item))
        (t nil)))

;;;###autoload
(defun gcl/string-inflection-cycle-auto ()
  "switching by major-mode"
  (interactive)
  (cond
   ;; for emacs-lisp-mode
   ((eq major-mode 'emacs-lisp-mode)
    (string-inflection-all-cycle))
   ;; for python
   ((eq major-mode 'python-mode)
    (string-inflection-python-style-cycle))
   ;; for java
   ((eq major-mode 'java-mode)
    (string-inflection-java-style-cycle))
   (t
    ;; default
    (string-inflection-all-cycle))))

;; Current time and date
(defvar current-date-time-format "%Y-%m-%d %H:%M:%S"
  "Format of date to insert with `insert-current-date-time' func
See help of `format-time-string' for possible replacements")

(defvar current-time-format "%H:%M:%S"
  "Format of date to insert with `insert-current-time' func.
Note the weekly scope of the command's precision.")

;;;###autoload
(defun insert-current-date-time ()
  "insert the current date and time into current buffer.
Uses `current-date-time-format' for the formatting the date/time."
  (interactive)
  (insert (format-time-string current-date-time-format (current-time)))
  )

;;;###autoload
(defun insert-current-time ()
  "insert the current time (1-week scope) into the current buffer."
  (interactive)
  (insert (format-time-string current-time-format (current-time)))
  )

;;;###autoload
(defun my/capitalize-first-char (&optional string)
  "Capitalize only the first character of the input STRING."
  (when (and string (> (length string) 0))
    (let ((first-char (substring string nil 1))
          (rest-str   (substring string 1)))
      (concat (capitalize first-char) rest-str))))

;;;###autoload
(defun my/lowcase-first-char (&optional string)
  "Capitalize only the first character of the input STRING."
  (when (and string (> (length string) 0))
    (let ((first-char (substring string nil 1))
          (rest-str   (substring string 1)))
      (concat first-char rest-str))))

;;;###autoload
(defun gcl/async-shell-command-silently (command)
  "async shell command silently."
  (interactive)
  (let
      ((display-buffer-alist
        (list
         (cons
          "\\*Async Shell Command\\*.*"
          (cons #'display-buffer-no-window nil)))))
    (async-shell-command
     command)))

;;;###autoload
(defun gcl/embrace-prog-mode-hook ()
  (dolist (lst '((?` "`" . "`")))
    (embrace-add-pair (car lst) (cadr lst) (cddr lst))))

;;;###autoload
(defun gcl/embrace-org-mode-hook ()
  (dolist (lst '((?c "@@html:<font color=\"red\">" . "</font>@@")))
    (embrace-add-pair (car lst) (cadr lst) (cddr lst))))

;;;###autoload
(defun gcl/indent-org-block-automatically ()
  (interactive)
  (when (org-in-src-block-p)
   (org-edit-special)
   (indent-region (point-min) (point-max))
   (org-edit-src-exit)))

(setq doom-font (font-spec :family "Fira Code Retina" :size 15 :weight 'light)
      doom-variable-pitch-font (font-spec :family "Roboto" :style "Regular" :size 12 :weight 'regular))
;; (setq doom-theme 'spacemacs-light)
(setq doom-theme 'doom-one)

(add-hook 'org-mode-hook
          (lambda () (add-hook 'after-save-hook #'org-babel-tangle
                               :append :local)))

(setq
 ;; private information
 user-full-name "Zhicheng Lee"
 user-mail-address "gccll.love@gmail.com"
 user-blog-url "https://www.cheng92.com"

 warning-minimum-level :error
 ;; exit no confirm
 confirm-kill-emacs nil

 display-line-numbers-type t
 org-directory "~/.gclrc/org/"
 org-roam-directory "~/.gclrc/org/roam/"
 )

(add-to-list 'initial-frame-alist '(fullscreen . maximized))
(add-hook 'org-mode-hook 'turn-on-auto-fill)

(global-set-key (kbd "<f1>") nil)        ; ns-print-buffer
(global-set-key (kbd "<f2>") nil)        ; ns-print-buffer
(define-key evil-normal-state-map (kbd ",") nil)
(define-key evil-visual-state-map (kbd ",") nil)

(global-set-key (kbd "<f1>") 'gcl-everything/body)
(global-set-key (kbd "<f5>") 'deadgrep)
(global-set-key (kbd "<M-f5>") 'deadgrep-kill-all-buffers)
;; (global-set-key (kbd "<f8>") 'quickrun)
(global-set-key (kbd "<f12>") 'smerge-vc-next-conflict)
(global-set-key (kbd "<S-f12>") '+vc/smerge-hydra/body)
(global-set-key (kbd "M-z") 'zzz-to-char)
;; (global-set-key (kbd "C-t") '+vterm/toggle)
;; (global-set-key (kbd "C-S-t") '+vterm/here)
;; (global-set-key (kbd "C-d") 'kill-current-buffer)

(setq doom-localleader-key ",")
(map!
 :nv    ")" #'sp-forward-sexp
 :nv    "(" #'sp-backward-up-sexp
 :nv    "s-)" #'sp-down-sexp
 :nv    "s-(" #'sp-backward-sexp
 :nv    "gd"    #'xref-find-definitions
 :nv    "gD"    #'xref-find-references
 :nv    "gb"    #'xref-pop-marker-stack

 :niv   "C-e"   #'evil-end-of-line
 :niv   "C-="   #'er/expand-region

 "C-;"          #'tiny-expand
 "C-a"          #'crux-move-beginning-of-line
 "C-s"          #'+default/search-buffer

 "C-c f r"      #'gcl/indent-org-block-automatically

 "C-c i d"      #'insert-current-date-time
 "C-c i t"      #'insert-current-time
 ;; "C-c i d"      #'crux-insert-date
 "C-c i e"      #'emojify-inert-emoji
 "C-c i f"      #'js-doc-insert-function-doc
 "C-c i F"      #'js-doc-insert-file-doc

 "C-c o o"      #'crux-open-with
 "C-c o u"      #'crux-view-url
 "C-c o t"      #'crux-visit-term-buffer
 ;; org-roam
 "C-c o r o"    #'org-roam-ui-open

 "C-c r r"      #'vr/replace
 "C-c r q"      #'vr/query-replace

 "C-c y y"      #'youdao-dictionary-search-at-point+

 ;; Command/Window
 "s-<"          #'move-text-up
 "s->"          #'move-text-down
 "s-i"          #'gcl/string-inflection-cycle-auto
 ;; "s--"          #'sp-splice-sexp
 ;; "s-_"          #'sp-rewrap-sexp

 "M-i"          #'parrot-rotate-next-word-at-point
 "M--"          #'gcl/goto-match-paren
 )

(map! :leader
      :n "SPC"  #'execute-extended-command
      (:prefix ("d" . "Dir&Deletion")
       :n    "d"    #'deft)

      (:prefix ("e" . "Edit&Errors")
       ;; :n    "l"     #'lsp-treemacs-errors-list
       ))

(map! :map org-mode-map
      ;; t
      (:prefix ("t" . "Org Todos")
       :n "t" #'org-todo

       ;; t c
       (:prefix ("c" . "Checkbox")
        :n   "c"     #'org-toggle-checkbox
        :n   "u"     #'org-update-checkbox-count)

       (:prefix ("p" . "priority")
       :n "p" #'org-priority
       :n "u" #'org-priority-up
       :n "d" #'org-priority-down
       ))

      ;; C-c
      (:prefix "C-c"
       (:prefix ("f" . "Format")
        :n   "r"     #'gcl/indent-org-block-automatically)
       (:prefix ("e" . "Emoji")
        "e" #'all-the-icons-insert
        "a" #'all-the-icons-insert-faicon
        "f" #'all-the-icons-insert-fileicon
        "w" #'all-the-icons-insert-wicon
        "o" #'all-the-icons-insert-octicon
        "m" #'all-the-icons-insert-material
        "i" #'all-the-icons-insert-alltheicon
        )
       (:prefix ("c" . "Org Clock")
        "i" #'org-clock-in
        "o" #'org-clock-out
        "h" #'counsel-org-clock-history
        "g" #'counsel-org-clock-goto
        "c" #'counsel-org-clock-context
        "r" #'counsel-org-clock-rebuild-history
        )
       (:prefix ("i" . "Insert")
        "u" #'org-mac-chrome-insert-frontmost-url
        "c" #'copyright
        )))

(use-package! mixed-pitch
  :hook (org-mode . mixed-pitch-mode)
  :config
  (setq mixed-pitch-face 'variable-pitch))

;; (tiny-setup-default)

(global-pangu-spacing-mode 1)
;; insert whitespace in some specific mode
(add-hook 'org-mode-hook
           '(lambda ()
            (set (make-local-variable 'pangu-spacing-real-insert-separtor) t)))

(defhydra gcl-repl-hydra (:color blue :columns 3 :hint nil)
  "REPL "
  ("e" ielm " ELisp")
  ("h" httprepl " HTTP")
  ("j" jq-interactivly " JSON")
  ("l" +lua/open-repl " Lua")
  ("n" nodejs-repl " Node.js")
  ("p" +python/open-repl " Python")
  ("s" skewer-repl " Skewer"))

(defhydra gcl-roam-ui-hydra (:color green)
  "Org Roam UI."
  ("t" orui-sync-theme "Sync Theme"))
(defhydra gcl-launcher-hydra (:color blue)
   "Launch"
   ("h" man "man")
   ("b" (browse-url "https://www.cheng92.com") "my-blog")
   ("r" (browse-url "http://www.reddit.com/r/emacs/") "reddit")
   ("w" (browse-url "http://www.emacswiki.org/") "emacswiki")
   ("s" shell "shell")
   ("q" nil "cancel"))

(defhydra gcl-everything (:color blue :columns 3 :hint nil)
  "🗯 做任何你想不到的事情~~~~ 👁👁👁👁👁👁👁👁👁
🌻"
  ("r" gcl-repl-hydra/body "REPL")
  ("l" gcl-launcher-hydra/body "Launch")
  ("1" gcl-roam-ui-hydra/body "Roam"))

(use-package! lsp-mode
  :commands lsp
  :config
  (setq lsp-idle-delay 0.2
        lsp-enable-file-watchers nil))

(use-package! lsp-ui
  :commands lsp-ui-mode
  :config
  (setq lsp-headerline-breadcrumb-enable t ; 左上角显示文件路径
        lsp-lens-enable t                  ; 显示被引用次数
        )
  :bind (:map lsp-ui-mode-map
         ([remap xref-find-definitions] . lsp-ui-peek-find-definitions)
         ([remap xref-find-references] . lsp-ui-peek-find-references)
         ([remap xref-pop-marker-stack] . lsp-ui-peek-jump-backward)
         ))

(after! which-key
  (setq! which-key-idle-delay 0.1
         which-key-idle-secondary-delay 0.2))

;; dont display evilem-...
(setq which-key-allow-multiple-replacements t)
(after! which-key
  (pushnew!
   which-key-replacement-alist
   '(("" . "\\`+?evil[-:]?\\(?:a-\\)?\\(.*\\)") . (nil . "◂\\1"))
   '(("\\`g s" . "\\`evilem--?motion-\\(.*\\)") . (nil . "◃\\1"))
   ))

(use-package! visual-fill-column)

 (use-package! maple-iedit
    :commands (maple-iedit-match-all maple-iedit-match-next maple-iedit-match-previous)
    :config
    (delete-selection-mode t)
    (setq maple-iedit-ignore-case t)
    (defhydra maple/iedit ()
      ("n" maple-iedit-match-next "next")
      ("t" maple-iedit-skip-and-match-next "skip and next")
      ("T" maple-iedit-skip-and-match-previous "skip and previous")
      ("p" maple-iedit-match-previous "prev"))
    :bind (:map evil-visual-state-map
           ("n" . maple/iedit/body)
           ("C-n" . maple-iedit-match-next)
           ("C-p" . maple-iedit-match-previous)
           ("C-t" . map-iedit-skip-and-match-next)
           ("C-T" . map-iedit-skip-and-match-previous)))

;; (when (memq window-system '(mac ns x))
;; (exec-path-from-shell-initialize))

;; (use-package! color-rg
;;   :commands (color-rg-search-input
;;              color-rg-search-symbol
;;              color-rg-search-input-in-project)
;;   :bind
;;   (:map isearch-mode-map
;;    ("M-s M-s" . isearch-toggle-color-rg)))

(use-package! visual-regexp
  :commands (vr/select-replace vr/select-query-replace))

(use-package! visual-regexp-steriods
  :commands (vr/select-replace vr/select-query-replace))

(setq org-list-demote-modify-bullet
      '(("+" . "-")
        ("-" . "+")
        ("*" . "+")
        ("1." . "a.")))


(after! org
  (add-hook 'org-mode-hook (lambda () (visual-line-mode -1)))

  (setq
   org-todo-keywords
   '((sequence "TODO(t)" "PROJECT(p)" "NEXT(n)" "WAIT(w)" "HOLD(h)" "IDEA(i)" "SOMEDAY(s)" "MAYBE(m)" "|" "DONE(d)" "CANCELLED(c)")
     (sequence "[ ](T)" "[-](S)" "[?](W)" "|" "[X](D)")
     ;; (sequence "|" "OKAY(o)" "YES(y)" "NO(x)")
     )
   org-todo-keyword-faces `(("NEXT" . ,(doom-color 'green))
                            ("TODO" . ,(doom-color 'yellow))
                            ("PROJECT" . ,(doom-color 'tan))
                            ("WAIT" . ,(doom-color 'teal))
                            ("HOLD" . ,(doom-color 'red))
                            ("IDEA" . ,(doom-color 'tomato))
                            ("SOMEDAY" . ,(doom-color 'base7))
                            ("MAYBE" . ,(doom-color 'base5))
                            ("[ ]" . ,(doom-color 'green))
                            ("[-]" . ,(doom-color 'yellow))
                            ("[?]" . ,(doom-color 'red))
                            )
   ;; org-enforce-todo-dependencies nil ;; if t, it hides todo entries with todo children from agenda
   ;; org-enforce-todo-checkbox-dependencies nil
   org-provide-todo-statistics t
   org-pretty-entities t
   org-hierarchical-todo-statistics t

   ;; org-startup-with-inline-images t
   org-hide-emphasis-markers t
   ;; org-fontify-whole-heading-line nil
   org-src-fontify-natively t
   org-imenu-depth 9

   org-use-property-inheritance t

   org-log-done 'time
   org-log-redeadline 'time
   org-log-reschedule 'time
   org-log-into-drawer "LOGBOOK"

   org-src-preserve-indentation t
   org-edit-src-content-indentation 0
   )
  )

(use-package! websocket
  :after org-roam)
(use-package! org-roam-ui
  :after org-roam
  :config
  (setq org-roam-ui-open-on-start nil
        org-roam-ui-update-on-save t
        org-roam-ui-follow t
        org-roam-ui-sync-theme t
        org-roam-ui-browser-function #'xwidget-webkit-browse-url))

(use-package! org-fragtog
  :after org
  :hook (org-mode . org-fragtog-mode)
  )

(use-package! org-ol-tree
  :commands org-ol-tree)

(map! :map org-mode-map
    :after org
    :localleader
    :desc "Outline" "O" #'org-ol-tree)

(use-package! org-appear
  :hook (org-mode . org-appear-mode)
  :config
  (setq org-appear-autoemphasis t
        org-appear-autosubmarkers t
        org-appear-autolinks t)
  )

(use-package! org-fancy-priorities
    :diminish
    :hook (org-mode . org-fancy-priorities-mode)
    :config
    (setq org-fancy-priorities-list
          '("🅰" "🅱" "🅲" "🅳" "🅴")))

(use-package! dash-at-point
  :bind
  (("C-c d d" . dash-at-point)
   ("C-c d D" . dash-at-point-with-docset)))

(after! company
  (setq company-idle-delay 0.2
        company-minimum-prefix-length 2)
  (add-hook 'evil-normal-state-entry-hook #'company-abort)) ;; make aborting less annoying.

(use-package! counsel-osx-app
  :bind* ("S-M-SPC" . counsel-osx-app)
  :commands counsel-osx-app
  :config
  (setq counsel-osx-app-location
        (list "/Applications"
              "/Applications/Misc"
              "/Applications/Utilities"
              (expand-file-name "~/Applications")
              (expand-file-name "~/.nix-profile/Applications")
              "/Applications/Xcode.app/Contents/Applications")))

(use-package! cycle-quotes
  :bind
  ("C-'" . cycle-quotes))

(use-package! dotenv-mode
  :mode ("\\.env\\.?.*\\'" . dotenv-mode))

(use-package! emacs-everywhere
  :if (daemonp)
  :config
  (require 'spell-fu)
  (setq emacs-everywhere-major-mode-function #'org-mode
        emacs-everywhere-frame-name-format "Edit ∷ %s — %s")
  (defadvice! emacs-everywhere-raise-frame ()
    :after #'emacs-everywhere-set-frame-name
    (setq emacs-everywhere-frame-name (format emacs-everywhere-frame-name-format
                                (emacs-everywhere-app-class emacs-everywhere-current-app)
                                (truncate-string-to-width
                                 (emacs-everywhere-app-title emacs-everywhere-current-app)
                                 45 nil nil "…")))
    ;; need to wait till frame refresh happen before really set
    (run-with-timer 0.1 nil #'emacs-everywhere-raise-frame-1))
  (defun emacs-everywhere-raise-frame-1 ()
    (call-process "wmctrl" nil nil nil "-a" emacs-everywhere-frame-name)))

(use-package! engine-mode
  :config
  (engine/set-keymap-prefix (kbd "C-c s"))
  (defengine baidu "https://www.baidu.com/s?wd=%s"
    :keybinding "b")
  (defengine github
    "https://github.com/search?ref=simplesearch&q=%s"
    :keybinding "g")
  (defengine qwant
    "https://www.qwant.com/?q=%s"
    :docstring "什么都能搜到哦~~😍😍"
    :keybinding "q")
  (defengine rfcs
    "http://pretty-rfc.herokuapp.com/search?q=%s"
    :keybinding "r")
  (defengine stack-overflow
    "https://stackoverflow.com/search?q=%s"
    :keybinding "s")
  (defengine twitter
    "https://twitter.com/search?q=%s"
    :keybinding "t")
  (defengine wolfram-alpha
    "http://www.wolframalpha.com/input/?i=%s"
    :docstring "数学搜索引擎，公式，坐标图等。"
    :keybinding "w")
  (defengine google
    "http://www.google.com/search?ie=utf-8&oe=utf-8&q=%s"
    :keybinding "/")
  (defengine youtube
    "http://www.youtube.com/results?aq=f&oq=&search_query=%s"
    :keybinding "y")
  (engine-mode 1))

(use-package! flycheck
    :config
    (add-hook 'after-init-hook 'global-flycheck-mode)
    (add-hook 'flycheck-mode-hook 'gcl/use-eslint-from-node-modules))

(use-package! js-doc
  :bind (:map js2-mode-map
         ("@" . js-doc-insert-tag))
  :config
  (setq js-doc-mail-address user-mail-address
       js-doc-author (format "%s<%s>" user-full-name js-doc-mail-address)
       js-doc-url user-blog-url
       js-doc-license "MIT"))

(after! leetcode
  (setq leetcode-prefer-language "javascript"
        leetcode-prefer-sql "mysql"
        leetcode-save-solutions t
        leetcode-directory "~/github/mine/make-leetcode"))

(setq auto-insert 'other
      auto-insert-query nil
      auto-insert-directory (concat doom-private-dir "auto-insert-templates")
      auto-insert-alist '(
                          ("\\.\\([Hh]\\|hh\\|hpp\\)\\'" . "template.h")
                          ("\\.\\(jsx?\\|tsx?\\)\\'" . "my.js")
                          ("\\.\\(vue\\)\\'" . "my.vue")
                          ))
(add-hook 'find-file-hook #'auto-insert)

(sp-local-pair
 '(org-mode)
 "<<" ">>"
 :actions '(insert))

(use-package! smartparens
  :init
  (map! :map smartparens-mode-map
       "C-)" #'sp-forward-slurp-sexp
       "C-(" #'sp-forward-barf-sexp
       "C-{" #'sp-backward-slurp-sexp
       "C-}" #'sp-backward-barf-sexp
       "s--" #'sp-splice-sexp
       "s-_" #'sp-rewrap-sexp
       ))

(use-package! popper
  :bind
  ("C-`" . popper-toggle-latest)
  ("C-~" . popper-cycle)
  ("C-s-`" . popper-kill-latest-popup)
  :custom
  (popper-reference-buffers
   '("*eshell*"
     "*vterm*"
     "*color-rg*"
     "Output\\*$"
     "*Process List*"
     "COMMIT_EDITMSG"
     embark-collect-mode
     deadgrep-mode
     grep-mode
     rg-mode
     rspec-compilation-mode
     inf-ruby-mode
     nodejs-repl-mode
     ts-comint-mode
     compilation-mode))
  :config
  (defun zero-point-thirty-seven () 0.37)
  (advice-add 'popper-determine-window-height :override #'zero-point-thirty-seven)
  :init
  (popper-mode)
  )

;; https://github.com/dp12/parrot
(use-package! parrot
  :config
  (parrot-mode))

;; apend
(dolist (entry '(
                 (:rot ("lizchicheng" "fanlingling"))
                 (:rot ("Array" "Object" "String" "Function"))
                 ))
  (add-to-list 'parrot-rotate-dict entry))

(use-package! org-roam
  :bind (("C-c n l" . org-roam-buffer-toggle)
         ("C-c n f" . org-roam-node-find)
         ("C-c n g" . org-roam-graph)
         ("C-c n i" . org-roam-node-insert)
         ("C-c n c" . org-roam-capture)
         ;; Dailies
         ("C-c n j" . org-roam-dailies-capture-today)
         )
    )

(setq
 css-indent-offset 2
 js2-basic-offset 2
 js-switch-indent-offset 2
 js-indent-level 2
 js-jsx-indent-level 2
 js2-mode-show-parse-errors nil
 js2-mode-show-strict-warnings nil
 web-mode-attr-indent-offset 2
 web-mode-code-indent-offset 2
 web-mode-css-indent-offset 2
 web-mode-markup-indent-offset 2
 web-mode-enable-current-element-highlight t
 web-mode-enable-current-column-highlight t)
