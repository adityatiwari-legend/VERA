-- Same query the /admin/complaints page runs (with the new dispute tallies)
SELECT r.id, r.address_label, r.severity, r.status, r.created_at, r.updated_at,
       u.name AS reporter_name,
       (SELECT COUNT(*)::int FROM pothole_confirmations c WHERE c.report_id = r.id) AS confirmations,
       (SELECT COUNT(*)::int FROM pothole_votes v WHERE v.report_id = r.id AND v.vote_type = 'REJECT') AS rejects,
       (SELECT COUNT(*)::int FROM pothole_votes v WHERE v.report_id = r.id AND v.vote_type = 'FLAG') AS flags,
       e.id AS escrow_id,
       (SELECT COUNT(*)::int FROM fund_request_reports frr
         JOIN fund_requests fr ON fr.id = frr.fund_request_id
         WHERE frr.report_id = r.id AND fr.status = 'SANCTIONED') AS sanctioned
FROM pothole_reports r
JOIN users u ON u.id = r.reporter_id
LEFT JOIN hisaab_escrows e ON e.report_id = r.id
WHERE ($1::text = 'ALL' OR r.status = $1::text)
ORDER BY
  CASE r.status WHEN 'CONFIRMED' THEN 0 WHEN 'OPEN' THEN 1 WHEN 'ESCALATED' THEN 2 ELSE 3 END,
  r.created_at DESC
LIMIT 100;
