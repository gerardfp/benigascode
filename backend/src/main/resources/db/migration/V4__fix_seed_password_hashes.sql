-- Fix mock Argon2 password hashes in seed users with valid Argon2id hashes
UPDATE users 
SET password_hash = '{argon2}$argon2id$v=19$m=16384,t=2,p=1$63gxwLYFH0PPhyVb7V6ASg$nzG5BgaK3ECxHg0HQhSZyesKr9Tk7wp/hEaT793cpkU' 
WHERE username = 'admin@benigascode.local';

UPDATE users 
SET password_hash = '{argon2}$argon2id$v=19$m=16384,t=2,p=1$o5sBzZCLkUgZNiEVRZelhA$ImiuNBz91TfcXgHTrzZAiNgS/HPk/WjK4IQtihmyhLc' 
WHERE username = 'teacher@benigascode.local';

UPDATE users 
SET password_hash = '{argon2}$argon2id$v=19$m=16384,t=2,p=1$59kc7y5wo61upE/WPccMTg$YojdUDWjFQetqu44HlcktBimdKWyqAdSbRW5qu58Vj4' 
WHERE username = 'student@benigascode.local';

