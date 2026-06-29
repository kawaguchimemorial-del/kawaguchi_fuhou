-- 0005 作成ウィザードのフォーム状態を保存し、編集時にロスなく復元するためのカラム
alter table memorials add column if not exists form_state jsonb;
