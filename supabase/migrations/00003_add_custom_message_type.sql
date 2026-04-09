-- リピート分析からのカスタムLINE送信に対応
ALTER TABLE line_message_history DROP CONSTRAINT line_message_history_message_type_check;
ALTER TABLE line_message_history ADD CONSTRAINT line_message_history_message_type_check
  CHECK (message_type IN ('thank_you', 'reminder1', 'reminder2', 'dormant', 'custom'));
