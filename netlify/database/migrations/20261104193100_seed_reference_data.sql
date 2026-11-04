-- Reference data required by teacher profiles, explore filters and badges.

INSERT INTO "Language" ("id", "slug", "name") VALUES
  (gen_random_uuid()::text, 'sinhala', 'Sinhala'),
  (gen_random_uuid()::text, 'english', 'English'),
  (gen_random_uuid()::text, 'tamil', 'Tamil')
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "Subject" ("id", "slug", "name", "nameSi") VALUES
  (gen_random_uuid()::text, 'mathematics', 'Mathematics', 'ගණිතය'),
  (gen_random_uuid()::text, 'science', 'Science', 'විද්‍යාව'),
  (gen_random_uuid()::text, 'combined-maths', 'Combined Mathematics', 'සංයුක්ත ගණිතය'),
  (gen_random_uuid()::text, 'physics', 'Physics', 'භෞතික විද්‍යාව'),
  (gen_random_uuid()::text, 'chemistry', 'Chemistry', 'රසායන විද්‍යාව'),
  (gen_random_uuid()::text, 'biology', 'Biology', 'ජීව විද්‍යාව'),
  (gen_random_uuid()::text, 'ict', 'ICT', 'තොරතුරු තාක්ෂණය'),
  (gen_random_uuid()::text, 'english', 'English', 'ඉංග්‍රීසි'),
  (gen_random_uuid()::text, 'sinhala', 'Sinhala', 'සිංහල'),
  (gen_random_uuid()::text, 'tamil', 'Tamil', 'දෙමළ'),
  (gen_random_uuid()::text, 'history', 'History', 'ඉතිහාසය'),
  (gen_random_uuid()::text, 'geography', 'Geography', 'භූගෝල විද්‍යාව'),
  (gen_random_uuid()::text, 'business-studies', 'Business Studies', 'ව්‍යාපාර අධ්‍යයනය'),
  (gen_random_uuid()::text, 'accounting', 'Accounting', 'ගිණුම්කරණය'),
  (gen_random_uuid()::text, 'economics', 'Economics', 'ආර්ථික විද්‍යාව'),
  (gen_random_uuid()::text, 'political-science', 'Political Science', 'දේශපාලන විද්‍යාව'),
  (gen_random_uuid()::text, 'buddhism', 'Buddhism', 'බුද්ධ ධර්මය'),
  (gen_random_uuid()::text, 'health-science', 'Health Science', 'සෞඛ්‍ය විද්‍යාව'),
  (gen_random_uuid()::text, 'agriculture', 'Agriculture', 'කෘෂිකර්මය'),
  (gen_random_uuid()::text, 'statistics', 'Statistics', 'සංඛ්‍යානය'),
  (gen_random_uuid()::text, 'music', 'Music', 'සංගීතය'),
  (gen_random_uuid()::text, 'art', 'Art', 'චිත්‍ර කලාව')
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "District" ("id", "slug", "name", "nameSi", "province") VALUES
  (gen_random_uuid()::text, 'colombo', 'Colombo', 'කොළඹ', 'Western'),
  (gen_random_uuid()::text, 'gampaha', 'Gampaha', 'ගම්පහ', 'Western'),
  (gen_random_uuid()::text, 'kalutara', 'Kalutara', 'කළුතර', 'Western'),
  (gen_random_uuid()::text, 'kandy', 'Kandy', 'මහනුවර', 'Central'),
  (gen_random_uuid()::text, 'matale', 'Matale', 'මාතලේ', 'Central'),
  (gen_random_uuid()::text, 'nuwara-eliya', 'Nuwara Eliya', 'නුවරඑළිය', 'Central'),
  (gen_random_uuid()::text, 'galle', 'Galle', 'ගාල්ල', 'Southern'),
  (gen_random_uuid()::text, 'matara', 'Matara', 'මාතර', 'Southern'),
  (gen_random_uuid()::text, 'hambantota', 'Hambantota', 'හම්බන්තොට', 'Southern'),
  (gen_random_uuid()::text, 'jaffna', 'Jaffna', 'යාපනය', 'Northern'),
  (gen_random_uuid()::text, 'kilinochchi', 'Kilinochchi', 'කිලිනොච්චි', 'Northern'),
  (gen_random_uuid()::text, 'mannar', 'Mannar', 'මන්නාරම', 'Northern'),
  (gen_random_uuid()::text, 'vavuniya', 'Vavuniya', 'වවුනියාව', 'Northern'),
  (gen_random_uuid()::text, 'mullaitivu', 'Mullaitivu', 'මුලතිව්', 'Northern'),
  (gen_random_uuid()::text, 'batticaloa', 'Batticaloa', 'මඩකලපුව', 'Eastern'),
  (gen_random_uuid()::text, 'ampara', 'Ampara', 'අම්පාර', 'Eastern'),
  (gen_random_uuid()::text, 'trincomalee', 'Trincomalee', 'ත්‍රිකුණාමලය', 'Eastern'),
  (gen_random_uuid()::text, 'kurunegala', 'Kurunegala', 'කුරුණෑගල', 'North Western'),
  (gen_random_uuid()::text, 'puttalam', 'Puttalam', 'පුත්තලම', 'North Western'),
  (gen_random_uuid()::text, 'anuradhapura', 'Anuradhapura', 'අනුරාධපුරය', 'North Central'),
  (gen_random_uuid()::text, 'polonnaruwa', 'Polonnaruwa', 'පොළොන්නරුව', 'North Central'),
  (gen_random_uuid()::text, 'badulla', 'Badulla', 'බදුල්ල', 'Uva'),
  (gen_random_uuid()::text, 'monaragala', 'Monaragala', 'මොණරාගල', 'Uva'),
  (gen_random_uuid()::text, 'ratnapura', 'Ratnapura', 'රත්නපුර', 'Sabaragamuwa'),
  (gen_random_uuid()::text, 'kegalle', 'Kegalle', 'කෑගල්ල', 'Sabaragamuwa')
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "Grade" ("id", "slug", "name", "order") VALUES
  (gen_random_uuid()::text, 'grade-1', 'Grade 1', 1),
  (gen_random_uuid()::text, 'grade-6', 'Grade 6', 6),
  (gen_random_uuid()::text, 'grade-7', 'Grade 7', 7),
  (gen_random_uuid()::text, 'grade-8', 'Grade 8', 8),
  (gen_random_uuid()::text, 'grade-9', 'Grade 9', 9),
  (gen_random_uuid()::text, 'grade-10', 'Grade 10', 10),
  (gen_random_uuid()::text, 'grade-11', 'Grade 11', 11),
  (gen_random_uuid()::text, 'grade-12', 'Grade 12', 12),
  (gen_random_uuid()::text, 'grade-13', 'Grade 13', 13),
  (gen_random_uuid()::text, 'ol', 'O/L Exam', 100),
  (gen_random_uuid()::text, 'al', 'A/L Exam', 101)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "Badge" ("id", "key", "name", "nameSi", "description", "kind") VALUES
  (gen_random_uuid()::text, 'verified-teacher', 'Verified Teacher', 'තහවුරු කළ ගුරුවරයා', 'Identity and claimed qualifications reviewed and approved by GuruLens admins.', 'verification'),
  (gen_random_uuid()::text, 'highly-rated', 'Highly Rated', NULL, 'Consistently high ratings from eligible students with a minimum review count.', 'achievement'),
  (gen_random_uuid()::text, 'active-educator', 'Active Educator', NULL, 'Regularly publishes lessons, videos and quizzes for students.', 'achievement'),
  (gen_random_uuid()::text, 'community-contributor', 'Community Contributor', NULL, 'Consistently safe, helpful and constructive contributions.', 'achievement')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "Setting" ("key", "value", "updatedAt") VALUES
  ('guidelines_version', '1.0', CURRENT_TIMESTAMP),
  ('ranking_methodology_version', '1.0-bayes-wilson', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
