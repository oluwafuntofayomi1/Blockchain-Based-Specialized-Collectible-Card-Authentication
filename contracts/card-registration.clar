;; card-registration.clar
;; This contract records details of rare or valuable cards

(define-data-var admin principal tx-sender)

;; Card data structure
(define-map cards
  { card-id: uint }
  {
    name: (string-ascii 64),
    series: (string-ascii 64),
    manufacturer: principal,
    rarity: (string-ascii 32),
    issue-date: uint,
    registered-by: principal
  }
)

;; Counter for card IDs
(define-data-var next-card-id uint u1)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-CARD-EXISTS (err u101))
(define-constant ERR-CARD-NOT-FOUND (err u102))
(define-constant ERR-NOT-VERIFIED-MANUFACTURER (err u103))

;; Check if caller is admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin)))

;; Register a new card
(define-public (register-card
    (name (string-ascii 64))
    (series (string-ascii 64))
    (manufacturer principal)
    (rarity (string-ascii 32))
    (issue-date uint))
  (let ((card-id (var-get next-card-id)))
    (begin
      ;; Verify manufacturer is legitimate (would call manufacturer-verification contract in production)
      ;; For simplicity, we're not making the contract call here
      (asserts! (is-none (map-get? cards {card-id: card-id})) ERR-CARD-EXISTS)
      (map-set cards
        {card-id: card-id}
        {
          name: name,
          series: series,
          manufacturer: manufacturer,
          rarity: rarity,
          issue-date: issue-date,
          registered-by: tx-sender
        }
      )
      (var-set next-card-id (+ card-id u1))
      (ok card-id))))

;; Get card details
(define-read-only (get-card (card-id uint))
  (map-get? cards {card-id: card-id}))

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) ERR-NOT-AUTHORIZED)
    (ok (var-set admin new-admin))))
