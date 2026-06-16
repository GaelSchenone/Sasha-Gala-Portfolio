-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: testpy
-- ------------------------------------------------------
-- Server version	8.0.45-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `images`
--

DROP TABLE IF EXISTS `images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `images` (
  `img_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `img_route` varchar(255) DEFAULT NULL,
  `img_alt` varchar(200) DEFAULT NULL,
  `display_order` int DEFAULT '0',
  `project_id` int DEFAULT NULL,
  `status_id` int DEFAULT '2',
  PRIMARY KEY (`img_id`),
  KEY `images_proyectos_FK` (`project_id`),
  KEY `images_status_FK` (`status_id`),
  CONSTRAINT `images_proyectos_FK` FOREIGN KEY (`project_id`) REFERENCES `proyectos` (`project_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `images_status_FK` FOREIGN KEY (`status_id`) REFERENCES `img_status` (`status_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `images`
--

LOCK TABLES `images` WRITE;
/*!40000 ALTER TABLE `images` DISABLE KEYS */;
INSERT INTO `images` VALUES (1,'/imgs/20260107_172311.jpg',NULL,0,14,1),(2,'/imgs/20260107_172426.jpg',NULL,1,14,1),(3,'/imgs/20260107_172436.jpg',NULL,2,14,1),(4,'/imgs/AG_INTERVIEWMAGAZINE-_28929.jpg',NULL,0,15,1),(5,'/imgs/ariana grande.png',NULL,1,15,1),(6,'/imgs/foto ceveriendo.png',NULL,0,16,1),(7,'/imgs/IMG_20251216_010239.jpg',NULL,1,16,1),(8,'/imgs/IMG_20251216_010241.jpg',NULL,0,17,1),(9,'/imgs/jellidubal.png',NULL,1,17,1),(10,'/imgs/Screenshot_20210827-014003_Instagram.jpg',NULL,2,17,1),(11,'/imgs/20260106_204321.jpg',NULL,0,19,1),(13,'/imgs/WhatsApp Image 2024-08-08 at 18.11.53.jpeg',NULL,0,18,1),(14,'/imgs/WhatsApp Image 2024-09-08 at 21.00.04.jpeg',NULL,1,18,1),(15,'/imgs/IMG_20251216_010238.jpg',NULL,0,20,1),(16,'/imgs/WhatsApp Image 2026-01-09 at 18.56.30.jpeg',NULL,1,20,1),(17,'/imgs/apple-macbook-pro-stock-2021-apple-event-2021-dark-mode-6016x5468-6759_14_9d920ca4.webp',NULL,0,14,1),(18,'/imgs/WhatsApp_Image_2026-04-19_at_14.37.11_14_07368122.webp',NULL,0,14,1),(19,'/imgs/download_14_da326809.webp',NULL,0,14,1),(20,'/imgs/download_2_14_7e64cc70.webp',NULL,0,14,1),(21,'/imgs/WhatsApp_Image_2026-04-19_at_14.37.11_14_09c463ab.webp',NULL,0,14,1),(22,'/imgs/apple-macbook-pro-stock-2021-apple-event-2021-dark-mode-6016x5468-6759_17_b869f1c9.webp',NULL,0,17,1),(23,'/imgs/apple-macbook-pro-stock-2021-apple-event-2021-dark-mode-6016x5468-6759_17_912ed94d.webp',NULL,0,17,1),(24,'/imgs/WhatsApp_Image_2026-04-19_at_14.36.18_17_84206e36.webp',NULL,0,17,1),(25,'/imgs/2454269-cruel-summer-617-02_17_c27a43f7.webp',NULL,0,17,1),(26,'/imgs/download_1_17_59793b1e.webp',NULL,0,17,1),(27,'/imgs/2454269-cruel-summer-617-02_17_74f51e02.webp',NULL,0,17,1),(28,'/imgs/download_17_de77b840.webp',NULL,0,17,1),(29,'/imgs/WhatsApp_Image_2026-04-19_at_14.36.18_17_d7f1cec8.webp',NULL,0,17,1),(30,'/imgs/2454269-cruel-summer-617-02_19_6a9b0e95.webp',NULL,0,19,1),(31,'/imgs/WhatsApp_Image_2026-04-19_at_14.36.18_19_922f3ddc.webp',NULL,0,19,1),(32,'/imgs/WhatsApp_Image_2026-04-19_at_14.36.18_14_98098c24.webp',NULL,0,14,1),(33,'/imgs/WhatsApp_Image_2026-04-19_at_14.37.11_14_aaa11865.webp',NULL,0,14,1),(34,'/imgs/WhatsApp_Image_2026-04-19_at_14.36.18_15_7632e612.webp',NULL,0,15,1),(35,'/imgs/WhatsApp_Image_2026-04-19_at_14.37.11_15_3ba82bfb.webp',NULL,0,15,1),(40,'/imgs/download_1_21_1041a176.webp',NULL,0,21,1),(41,'/imgs/WhatsApp_Image_2026-04-19_at_14.37.11_21_28adfa3a.webp',NULL,0,21,1),(42,'/imgs/download_2_21_6ff0481d.webp',NULL,0,21,1),(43,'/imgs/apple-macbook-pro-stock-2021-apple-event-2021-dark-mode-6016x5468-6759_21_52db8a78.webp',NULL,0,21,1),(44,'/imgs/WhatsApp_Image_2026-04-19_at_14.36.18_archive_81d4ada8.webp',NULL,1,NULL,3),(45,'/imgs/WhatsApp_Image_2026-04-19_at_14.37.11_archive_04c560a2.webp',NULL,2,NULL,3),(46,'/imgs/2454269-cruel-summer-617-02_archive_1224e532.webp',NULL,3,NULL,3),(47,'/imgs/download_1_archive_51e4570e.webp',NULL,4,NULL,3),(48,'/imgs/download_archive_e81936a5.webp',NULL,5,NULL,3),(49,'/imgs/download_2_archive_1c8d007a.webp',NULL,6,NULL,3);
/*!40000 ALTER TABLE `images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `img_status`
--

DROP TABLE IF EXISTS `img_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `img_status` (
  `status_id` int NOT NULL AUTO_INCREMENT,
  `status_name` varchar(50) NOT NULL,
  PRIMARY KEY (`status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `img_status`
--

LOCK TABLES `img_status` WRITE;
/*!40000 ALTER TABLE `img_status` DISABLE KEYS */;
INSERT INTO `img_status` VALUES (1,'active'),(2,'unassigned'),(3,'archive');
/*!40000 ALTER TABLE `img_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `proyectos`
--

DROP TABLE IF EXISTS `proyectos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proyectos` (
  `project_id` int NOT NULL AUTO_INCREMENT,
  `project_name` varchar(100) DEFAULT NULL,
  `project_description` varchar(500) DEFAULT NULL,
  `project_stack` varchar(100) DEFAULT NULL,
  `project_colaborators` varchar(100) DEFAULT NULL,
  `status` enum('draft','published','archived') DEFAULT 'published',
  `project_type` enum('full','quick') DEFAULT 'full',
  `display_order` int DEFAULT '0',
  `layout_json` json DEFAULT NULL,
  PRIMARY KEY (`project_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `proyectos`
--

LOCK TABLES `proyectos` WRITE;
/*!40000 ALTER TABLE `proyectos` DISABLE KEYS */;
INSERT INTO `proyectos` VALUES (14,'London','hola como estamos mi genteeee','web developer, diseñador','gael schenone, sasha gala','published','full','{\"sections\": [{\"id\": \"aedf194e-8f61-4efd-8701-0e8caf6f17ed\", \"gap\": 0, \"rows\": [[{\"fit\": \"cover\", \"src\": \"/imgs/WhatsApp_Image_2026-04-19_at_14.36.18_14_98098c24.webp\", \"position\": \"center\"}, {\"fit\": \"cover\", \"src\": \"/imgs/WhatsApp_Image_2026-04-19_at_14.37.11_14_aaa11865.webp\", \"position\": \"top left\"}]], \"height\": 700, \"columns\": 2}], \"layoutGap\": 100}'),(15,'La Frontera','hola','hola','hola','published','full','{\"sections\": [{\"id\": \"6230588f-92e3-4b0a-8f3b-ed5cdafaa52c\", \"gap\": 0, \"rows\": [[{\"fit\": \"cover\", \"src\": \"/imgs/WhatsApp_Image_2026-04-19_at_14.36.18_15_7632e612.webp\", \"position\": \"center\"}, {\"fit\": \"cover\", \"src\": \"/imgs/WhatsApp_Image_2026-04-19_at_14.37.11_15_3ba82bfb.webp\", \"position\": \"center\"}]], \"height\": 460, \"columns\": 2, \"autoHeight\": false}], \"layoutGap\": 20}'),(16,'Modular',NULL,NULL,NULL,'published','full',NULL),(17,'Nudo','Nudo is a sourdough bread and artisanal pastry shop in Buenos Aires, Argentina. Santi, the baker and founder, wanted to represent a childhood memory. He carried a tree knot for several kilometers during a hike in Bariloche. For him, this symbolizes his commitment and perseverance toward what he loves and enjoys.','Visual identity, Brand strategy','Lucía Vega','published','full','{\"sections\": [{\"id\": \"c42310b7-d71a-4d77-bc96-063836d71ba3\", \"gap\": 0, \"rows\": [[{\"fit\": \"cover\", \"src\": \"/imgs/apple-macbook-pro-stock-2021-apple-event-2021-dark-mode-6016x5468-6759_17_b869f1c9.webp\", \"position\": \"center\"}, {\"fit\": \"none\", \"src\": \"/imgs/apple-macbook-pro-stock-2021-apple-event-2021-dark-mode-6016x5468-6759_17_912ed94d.webp\", \"position\": \"center\"}]], \"height\": 400, \"columns\": 2, \"autoHeight\": false}, {\"id\": \"a3ad2835-f432-4909-95d4-66e5701be92a\", \"gap\": 0, \"rows\": [[{\"fit\": \"cover\", \"src\": \"/imgs/WhatsApp_Image_2026-04-19_at_14.36.18_17_84206e36.webp\", \"position\": \"center\"}, {\"fit\": \"cover\", \"src\": \"/imgs/2454269-cruel-summer-617-02_17_c27a43f7.webp\", \"position\": \"center\"}, {\"fit\": \"cover\", \"src\": \"/imgs/download_1_17_59793b1e.webp\", \"position\": \"center\"}, {\"fit\": \"cover\", \"src\": \"/imgs/2454269-cruel-summer-617-02_17_74f51e02.webp\", \"position\": \"center\"}, {\"fit\": \"cover\", \"src\": \"/imgs/download_17_de77b840.webp\", \"position\": \"center\"}, {\"fit\": \"cover\", \"src\": \"/imgs/WhatsApp_Image_2026-04-19_at_14.36.18_17_d7f1cec8.webp\", \"position\": \"center\"}]], \"height\": 400, \"columns\": 6, \"autoHeight\": false}], \"layoutGap\": 12}'),(18,'ATV',NULL,NULL,NULL,'published','full',NULL),(19,'CAYO','kdkasdkaskdaskdaskd','Branding, Hola, Chau','Gael, sasha','published','full','{\"sections\": [{\"id\": \"20fc4904-a8ca-4779-83c1-9f460d519c52\", \"gap\": 20, \"rows\": [[{\"fit\": \"cover\", \"src\": \"/imgs/2454269-cruel-summer-617-02_19_6a9b0e95.webp\", \"position\": \"center\"}, {\"fit\": \"cover\", \"src\": \"/imgs/WhatsApp_Image_2026-04-19_at_14.36.18_19_922f3ddc.webp\", \"position\": \"center\"}]], \"columns\": 2}], \"layoutGap\": 20}'),(20,'Hangar',NULL,NULL,NULL,'published','full',NULL),(21,'SMLR','Similar a la muerte es una marca de ropa re GAGA','Branding ','','published','quick','{\"sections\": [{\"id\": \"49851280-5cab-4854-bea7-4524b19b90ae\", \"gap\": 0, \"rows\": [[{\"fit\": \"cover\", \"src\": \"/imgs/apple-macbook-pro-stock-2021-apple-event-2021-dark-mode-6016x5468-6759_21_52db8a78.webp\", \"position\": \"center\"}]], \"height\": 400, \"columns\": 1, \"autoHeight\": false}, {\"id\": \"4758788d-7237-4cd7-8466-703dc548eeb2\", \"gap\": 0, \"rows\": [[{\"fit\": \"none\", \"src\": \"/imgs/WhatsApp_Image_2026-04-19_at_14.37.11_21_28adfa3a.webp\", \"position\": \"bottom left\"}, {\"fit\": \"cover\", \"src\": \"/imgs/download_2_21_6ff0481d.webp\", \"position\": \"center\"}]], \"height\": 490, \"columns\": 2, \"autoHeight\": false}, {\"id\": \"a9e2dca8-0920-487b-82a4-76d17919a9fc\", \"gap\": 0, \"rows\": [[{\"fit\": \"cover\", \"src\": \"/imgs/download_1_21_1041a176.webp\", \"position\": \"center\"}]], \"height\": 400, \"columns\": 1, \"autoHeight\": false}], \"layoutGap\": 100}');
/*!40000 ALTER TABLE `proyectos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `site_config`
--

DROP TABLE IF EXISTS `site_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_data` json NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `site_config`
--

LOCK TABLES `site_config` WRITE;
/*!40000 ALTER TABLE `site_config` DISABLE KEYS */;
INSERT INTO `site_config` VALUES (1,'{\"name\": \"Sasha Gala\", \"links\": [{\"url\": \"#\", \"title\": \"Behance\"}, {\"url\": \"#\", \"title\": \"LinkedIn\"}, {\"url\": \"#\", \"title\": \"Mail\"}], \"stack\": \"Graphic Designer, Professor\", \"description\": \"Hi! Im Sasha, a Graphic Designer based in Buenos Aires, Argentina.\\nI specialize in branding, editorial design, and digital communication.\\nIm a Graphic Design professor at FADU, UBA, Catedra Gabriele.\\n\\nI love diving deep into every project, learning what defines it so I can capture its essence and translate it into authentic communication and design. I work from the heart of each project, focusing on aligning its narrative so the concept can naturally emerge.\"}');
/*!40000 ALTER TABLE `site_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(100) NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `google_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'gaelsantos034@gmail.com','Gael Schenone','118322201437863302336','2026-04-21 05:15:22');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-22 13:43:00
