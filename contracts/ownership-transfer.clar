;; ownership-transfer.clar
;; This contract tracks changes in card possession

(define-data-var admin principal tx-sender)

;; Ownership data structure
(define-map card-owners
  { card-id: uint }
  { owner: principal }
)

;; Ownership history
(define-map ownership-history
  { card-id: uint, index: uint }
  {
    previous-owner: principal,
    new-owner: principal,
    transfer-date: uint
  }
)

;; Counter for history entries per card
(define-map history-counters
  { card-id: uint }
  { count: uint }
)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-CARD-NOT-FOUND (err u101))
(define-constant ERR-NOT-OWNER (err u102))

;; Register initial ownership
(define-public (register-ownership (card-id uint))
  (begin
    ;; In a real implementation, we would verify the card exists in the registration contract
    (asserts! (is-none (map-get? card-owners {card-id: card-id})) ERR-CARD-NOT-FOUND)
    (map-set card-owners {card-id: card-id} {owner: tx-sender})
    (map-set history-counters {card-id: card-id} {count: u0})
    (ok true)))

;; Transfer ownership
(define-public (transfer-ownership (card-id uint) (new-owner principal))
  (let (
    (current-owner (get owner (default-to {owner: tx-sender} (map-get? card-owners {card-id: card-id}))))
    (history-count (get count (default-to {count: u0} (map-get? history-counters {card-id: card-id}))))
  )
    (begin
      (asserts! (is-eq tx-sender current-owner) ERR-NOT-OWNER)

      ;; Record in history
      (map-set ownership-history
        {card-id: card-id, index: history-count}
        {
          previous-owner: current-owner,
          new-owner: new-owner,
          transfer-date: block-height
        }
      )

      ;; Update current owner
      (map-set card-owners {card-id: card-id} {owner: new-owner})

      ;; Increment history counter
      (map-set history-counters {card-id: card-id} {count: (+ history-count u1)})

      (ok true))))

;; Get current owner of a card
(define-read-only (get-owner (card-id uint))
  (map-get? card-owners {card-id: card-id}))

;; Get ownership history entry
(define-read-only (get-history-entry (card-id uint) (index uint))
  (map-get? ownership-history {card-id: card-id, index: index}))

;; Get number of history entries for a card
(define-read-only (get-history-count (card-id uint))
  (get count (default-to {count: u0} (map-get? history-counters {card-id: card-id}))))
