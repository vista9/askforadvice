SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

CREATE TABLE `cache` (
  `id` bigint NOT NULL,
  `json` json NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `domains` (
  `domain` varchar(32) COLLATE utf8mb4_general_ci NOT NULL,
  `ownerID` bigint NOT NULL,
  `ownedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `paymentID` text COLLATE utf8mb4_general_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `users` (
  `id` int NOT NULL,
  `telegram` bigint NOT NULL,
  `receive_id` bigint NOT NULL,
  `receive_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `premium_user` tinyint(1) NOT NULL DEFAULT '0',
  `admin_user` tinyint(1) NOT NULL DEFAULT '0',
  `start_until` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `cache`
  ADD UNIQUE KEY `id` (`id`);

ALTER TABLE `domains`
  ADD UNIQUE KEY `domain` (`domain`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `telegram` (`telegram`),
  ADD UNIQUE KEY `receive_id` (`receive_id`);

ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
