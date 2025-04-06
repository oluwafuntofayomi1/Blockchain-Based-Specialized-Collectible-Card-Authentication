;; grading-certification.clar
;; This contract documents condition assessments for cards

(define-data-var admin principal tx-sender)

;; Map of verified grading agencies
(define-map verified-graders principal bool)

;; Grading data structure
(define-map gradings
  { card-id: uint }
  {
    grade: uint,
    grader: principal,
    grading-date: uint,
    notes: (string-ascii 256)
  }
)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-ALREADY-GRADED (err u101))
(define-constant ERR-NOT-VERIFIED-GRADER (err u102))

;; Check if caller is admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin)))

;; Add a verified grader
(define-public (add-grader (grader principal))
  (begin
    (asserts! (is-admin) ERR-NOT-AUTHORIZED)
    (ok (map-set verified-graders grader true))))

;; Remove a verified grader
(define-public (remove-grader (grader principal))
  (begin
    (asserts! (is-admin) ERR-NOT-AUTHORIZED)
    (ok (map-delete verified-graders grader))))

;; Check if a grader is verified
(define-private (is-verified-grader (grader principal))
  (default-to false (map-get? verified-graders grader)))

;; Add grading for a card
(define-public (grade-card
    (card-id uint)
    (grade uint)
    (notes (string-ascii 256)))
  (begin
    (asserts! (is-verified-grader tx-sender) ERR-NOT-VERIFIED-GRADER)
    (asserts! (is-none (map-get? gradings {card-id: card-id})) ERR-ALREADY-GRADED)
    (ok (map-set gradings
      {card-id: card-id}
      {
        grade: grade,
        grader: tx-sender,
        grading-date: block-height,
        notes: notes
      }))))

;; Get grading information for a card
(define-read-only (get-grading (card-id uint))
  (map-get? gradings {card-id: card-id}))

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) ERR-NOT-AUTHORIZED)
    (ok (var-set admin new-admin))))
