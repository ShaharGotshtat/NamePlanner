-- Adds the "biblical" theme tag to names known as the names of biblical figures.
-- db/seed.sql inserts with "on conflict do nothing", so an existing database needs this update.
-- Safe to run more than once.
update names
set tags = jsonb_set(tags, '{meaningCategories}', (tags -> 'meaningCategories') || '["biblical"]'::jsonb)
where name_he in ('דוד', 'יוסף', 'אדם', 'יהונתן', 'משה', 'אליה', 'יואב', 'נדב', 'דניאל',
                  'תמר', 'נועה', 'יעל', 'אביגיל', 'מיכל', 'אסתר', 'רות', 'חנה', 'שרה')
  and not (tags -> 'meaningCategories') ? 'biblical';
