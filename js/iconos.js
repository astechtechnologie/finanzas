/* Finora - Catalogo de iconos SVG locales. No necesita CDN. */
(function () {
  'use strict';
  const App = window.App = window.App || {};
  const DIBUJOS = {
  "tag": "<path d=\"M3 4h9l9 9-8 8-10-10V4Z\"/><circle cx=\"8\" cy=\"8\" r=\"1\"/>",
  "utensils": "<path d=\"M4 3v7a3 3 0 0 0 6 0V3M7 3v18M15 3v8h6V3M18 11v10\"/>",
  "coffee": "<path d=\"M4 8h13v7a6 6 0 0 1-12 0V8ZM17 9h2a3 3 0 0 1 0 6h-2M3 21h16M7 3v2M12 3v2\"/>",
  "pizza": "<path d=\"m4 20 8-17 8 17a18 18 0 0 1-16 0Z\"/><circle cx=\"12\" cy=\"13\" r=\"1\"/><circle cx=\"10\" cy=\"17\" r=\"1\"/><circle cx=\"14\" cy=\"18\" r=\"1\"/>",
  "burger": "<path d=\"M4 10a8 8 0 0 1 16 0H4ZM3 13h18M4 17h16M6 20h12M8 7h.01M13 6h.01\"/>",
  "cake": "<rect x=\"4\" y=\"11\" width=\"16\" height=\"10\" rx=\"2\"/><path d=\"M4 15c3 0 3 2 6 2s3-2 6-2 3 2 4 2M12 3v6M9 8h6\"/>",
  "apple": "<path d=\"M12 6c-2-3-7-2-9 2-2 5 1 12 5 13 2 .5 3-1 4-1s2 1.5 4 1c4-1 7-8 5-13-2-4-7-5-9-2ZM12 6c0-3 2-5 5-5\"/>",
  "carrot": "<path d=\"M8 9c5-4 9-1 8 4-1 4-7 8-12 9 1-5 2-9 4-13ZM11 8 9 3M13 8l4-6M15 9l6-2\"/>",
  "glass-water": "<path d=\"M5 3h14l-2 18H7L5 3ZM6 11h12M9 15h.01\"/>",
  "wine": "<path d=\"M6 3h12v5a6 6 0 0 1-12 0V3ZM12 14v7M7 21h10\"/>",
  "beer": "<path d=\"M5 5h12v16H5V5ZM17 7h2a3 3 0 0 1 0 6h-2M8 8v8M12 8v8\"/>",
  "shopping-cart": "<circle cx=\"9\" cy=\"20\" r=\"1\"/><circle cx=\"19\" cy=\"20\" r=\"1\"/><path d=\"M2 3h2l3 13h13l2-9H5\"/>",
  "shopping-bag": "<rect x=\"4\" y=\"7\" width=\"16\" height=\"15\" rx=\"2\"/><path d=\"M9 8V6a3 3 0 0 1 6 0v2\"/>",
  "basket": "<path d=\"m4 10 2 11h12l2-11H4ZM8 10l4-7 4 7M3 10h18M9 14v4M15 14v4\"/>",
  "receipt": "<path d=\"M5 3h14v18l-3-2-4 2-4-2-3 2V3ZM9 8h6M9 12h6M9 16h3\"/>",
  "home": "<path d=\"m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7\"/>",
  "sofa": "<path d=\"M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3M4 11a2 2 0 0 0-2 2v5h20v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-2-2ZM5 18v3M19 18v3\"/>",
  "bed": "<path d=\"M3 5v16M21 9v12M3 17h18V9H3M5 9V6h6v3M13 9V6h6v3\"/>",
  "lightbulb": "<path d=\"M9 18h6M9 21h6M8 14a7 7 0 1 1 8 0l-1 4H9l-1-4Z\"/>",
  "droplet": "<path d=\"M12 2C8 8 5 11 5 15a7 7 0 0 0 14 0c0-4-3-7-7-13Z\"/>",
  "flame": "<path d=\"M12 22c5 0 8-3 8-8 0-4-2-7-5-11 0 5-2 6-3 7-2-2-3-4-3-6-3 4-5 8-5 11 0 4 3 7 8 7Z\"/>",
  "wrench": "<path d=\"M21 7a6 6 0 0 1-8 7L6 21l-3-3 7-7a6 6 0 0 1 7-8l-4 4 4 4 4-4Z\"/>",
  "broom": "<path d=\"M16 3 8 13M7 13l-4 7 8 2 5-9-9-1Z\"/>",
  "washing-machine": "<rect x=\"4\" y=\"2\" width=\"16\" height=\"20\" rx=\"2\"/><circle cx=\"12\" cy=\"14\" r=\"5\"/><path d=\"M7 5h.01M11 5h6\"/>",
  "car": "<path d=\"M5 15 7 8h10l2 7M4 15h16v5H4v-5ZM6 20v2M18 20v2M4 11H2M22 11h-2M8 17h.01M16 17h.01\"/>",
  "bus": "<rect x=\"4\" y=\"3\" width=\"16\" height=\"17\" rx=\"3\"/><path d=\"M4 10h16M4 16h16M8 20v2M16 20v2M8 13h.01M16 13h.01\"/>",
  "bike": "<circle cx=\"5\" cy=\"17\" r=\"4\"/><circle cx=\"19\" cy=\"17\" r=\"4\"/><path d=\"m5 17 5-9 4 9h5l-5-9h-4M9 5h4\"/>",
  "motorcycle": "<circle cx=\"5\" cy=\"17\" r=\"4\"/><circle cx=\"19\" cy=\"17\" r=\"4\"/><path d=\"m5 17 4-7h5l3 7M10 10l2 7M16 6h4l2 4M4 8h4\"/>",
  "plane": "<path d=\"M22 3 2 12l8 2 3 8 9-19ZM10 14l12-11\"/>",
  "train": "<rect x=\"5\" y=\"2\" width=\"14\" height=\"18\" rx=\"3\"/><path d=\"M5 12h14M8 16h.01M16 16h.01M8 20l-3 2M16 20l3 2M8 6h8\"/>",
  "ship": "<path d=\"m12 3 7 4v7l3 2-4 5-6-2-6 2-4-5 3-2V7l7-4ZM8 7h8M12 3v11M2 22l4-1 6 2 6-2 4 1\"/>",
  "truck": "<path d=\"M2 6h13v12H2V6ZM15 10h4l3 4v4h-7v-8Z\"/><circle cx=\"6\" cy=\"19\" r=\"2\"/><circle cx=\"18\" cy=\"19\" r=\"2\"/>",
  "fuel": "<path d=\"M5 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M4 21h14M7 7h8v6H7V7ZM17 9h2l2 3v7a2 2 0 0 1-4 0v-4\"/>",
  "taxi": "<path d=\"M5 14 7 8h10l2 6M4 14h16v6H4v-6ZM9 5h6M10 5V3h4v2M7 17h.01M17 17h.01\"/>",
  "map-pin": "<path d=\"M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 0 1 16 0Z\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/>",
  "briefcase": "<rect x=\"3\" y=\"7\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M9 7V4h6v3M3 12c6 4 12 4 18 0M11 14h2\"/>",
  "bank": "<path d=\"m2 10 10-7 10 7H2ZM3 21h18M5 12v7M10 12v7M14 12v7M19 12v7\"/>",
  "wallet": "<path d=\"M4 5h15v16H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM19 11h3v6h-7a3 3 0 0 1 0-6h4Z\"/>",
  "credit-card": "<rect x=\"2\" y=\"5\" width=\"20\" height=\"14\" rx=\"2\"/><path d=\"M2 10h20M6 15h4\"/>",
  "coins": "<circle cx=\"9\" cy=\"10\" r=\"6\"/><path d=\"M14 5a7 7 0 1 1-4 12M7 10h4M9 7v6\"/>",
  "piggy-bank": "<path d=\"M5 10a8 8 0 0 1 14 1l3 2v4l-3 1-2 3h-3v-2H9v2H6l-1-4-3-2v-4h3ZM11 7V5h4M16 13h.01\"/>",
  "chart-line": "<path d=\"M3 3v18h18M6 16l5-6 4 3 5-7\"/>",
  "chart-bar": "<path d=\"M3 21h18M5 16h3v5H5zM11 10h3v11h-3zM17 5h3v16h-3z\"/>",
  "calculator": "<rect x=\"5\" y=\"2\" width=\"14\" height=\"20\" rx=\"2\"/><path d=\"M8 6h8M8 11h2M14 11h2M8 15h2M14 15h2M8 19h2M14 19h2\"/>",
  "money": "<rect x=\"2\" y=\"5\" width=\"20\" height=\"14\" rx=\"2\"/><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M5 9h.01M19 15h.01\"/>",
  "hand-coins": "<path d=\"M2 13h4l4 3h5a2 2 0 0 0 0-4h-4l-3-3H2M2 20h5l4 2h8l4-5a2 2 0 0 0-3-2l-3 2M14 4a3 3 0 1 1 6 0 3 3 0 0 1-6 0\"/>",
  "heart": "<path d=\"M20 5c-2-2-5-2-8 1-3-3-6-3-8-1-4 4 1 10 8 16 7-6 12-12 8-16Z\"/>",
  "first-aid": "<rect x=\"3\" y=\"6\" width=\"18\" height=\"15\" rx=\"2\"/><path d=\"M9 6V4h6v2M12 10v8M8 14h8\"/>",
  "pill": "<path d=\"M7 21a5 5 0 0 1-4-8L13 3a5 5 0 0 1 8 8L11 21a5 5 0 0 1-4 0ZM8 8l8 8\"/>",
  "stethoscope": "<path d=\"M6 3v8a5 5 0 0 0 10 0V3M4 4h4M14 4h4M11 16v1a5 5 0 0 0 10 0v-3\"/><circle cx=\"21\" cy=\"12\" r=\"2\"/>",
  "tooth": "<path d=\"M5 3c-4 2-3 8-1 12l3 6c2 1 3-2 4-6s2-4 3 0 2 7 4 6l3-6c2-4 3-10-1-12-4-2-6 1-8 1S9 1 5 3Z\"/>",
  "scissors": "<circle cx=\"5\" cy=\"6\" r=\"3\"/><circle cx=\"5\" cy=\"18\" r=\"3\"/><path d=\"M8 8l13 13M8 16 21 3\"/>",
  "dumbbell": "<path d=\"M3 9v6M7 6v12M10 9h4M14 9h4M17 6v12M21 9v6M7 12h10\"/>",
  "running": "<circle cx=\"14\" cy=\"4\" r=\"2\"/><path d=\"m7 21 3-6 3-3-2-4-4 2-3 5M13 12l5 3 3 1M10 15l6 5M10 8l5-1 3 3\"/>",
  "book": "<path d=\"M3 5c5-2 8-1 9 0 1-1 4-2 9 0v15c-5-2-8-1-9 0-1-1-4-2-9 0V5ZM12 5v15\"/>",
  "graduation-cap": "<path d=\"m2 9 10-5 10 5-10 5L2 9ZM6 12v5c4 3 8 3 12 0v-5M22 9v7\"/>",
  "school": "<path d=\"M3 21V7l9-5 9 5v14M3 10h18M9 21v-7h6v7M7 7h.01M12 7h.01M17 7h.01\"/>",
  "pencil": "<path d=\"m4 20 4-1 12-12-3-3L5 16l-1 4ZM14 7l3 3M16 3l2-2 4 4-2 2\"/>",
  "laptop": "<rect x=\"5\" y=\"3\" width=\"14\" height=\"14\" rx=\"1\"/><path d=\"M3 21h18l-2-4H5l-2 4Z\"/>",
  "monitor": "<rect x=\"2\" y=\"3\" width=\"20\" height=\"15\" rx=\"2\"/><path d=\"M12 18v4M8 22h8\"/>",
  "smartphone": "<rect x=\"7\" y=\"2\" width=\"10\" height=\"20\" rx=\"2\"/><path d=\"M10 5h4M11 19h2\"/>",
  "tv": "<rect x=\"2\" y=\"6\" width=\"20\" height=\"15\" rx=\"2\"/><path d=\"m7 2 5 4 5-4M9 18h6\"/>",
  "headphones": "<path d=\"M4 13a8 8 0 1 1 16 0M4 13v7h5v-7H4ZM15 13h5v7h-5v-7Z\"/>",
  "camera": "<rect x=\"2\" y=\"6\" width=\"20\" height=\"15\" rx=\"2\"/><path d=\"m7 6 2-3h6l2 3\"/><circle cx=\"12\" cy=\"13\" r=\"4\"/>",
  "wifi": "<path d=\"M2 8a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8 16a5 5 0 0 1 8 0M12 20h.01\"/>",
  "printer": "<path d=\"M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 15h12v7H6zM18 12h.01\"/>",
  "gamepad": "<path d=\"M6 7h12a4 4 0 0 1 4 4l1 7a3 3 0 0 1-5 2l-3-3H9l-3 3a3 3 0 0 1-5-2l1-7a4 4 0 0 1 4-4ZM7 12v5M4.5 14.5h5M16 13h.01M19 15h.01\"/>",
  "music": "<path d=\"M9 18V5l12-3v13M9 8l12-3\"/><circle cx=\"6\" cy=\"19\" r=\"3\"/><circle cx=\"18\" cy=\"16\" r=\"3\"/>",
  "film": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4\"/>",
  "ticket": "<path d=\"M4 4h16v5a3 3 0 0 0 0 6v5H4v-5a3 3 0 0 0 0-6V4ZM12 4v16\"/>",
  "dog": "<path d=\"M5 10 2 7V4l6 2 4-2 4 2 6-2v3l-3 3v8l-5 4h-4l-5-4v-8ZM8 13h.01M16 13h.01M10 17h4l-2 2-2-2Z\"/>",
  "cat": "<path d=\"M4 4 8 7l4-2 4 2 4-3v13l-4 4H8l-4-4V4ZM8 13h.01M16 13h.01M10 17h4M12 17v2\"/>",
  "paw": "<path d=\"M8 20c-3 0-5-1-5-4 0-2 2-4 4-5 2-2 4-2 5-2s3 0 5 2c2 1 4 3 4 5 0 3-2 4-5 4l-4-2-4 2Z\"/><circle cx=\"5\" cy=\"7\" r=\"2\"/><circle cx=\"10\" cy=\"4\" r=\"2\"/><circle cx=\"16\" cy=\"4\" r=\"2\"/><circle cx=\"21\" cy=\"7\" r=\"2\"/>",
  "baby": "<circle cx=\"12\" cy=\"11\" r=\"8\"/><path d=\"M9 9h.01M15 9h.01M9 14c2 3 4 3 6 0M12 3c1-2 3-2 4-1\"/>",
  "users": "<circle cx=\"9\" cy=\"8\" r=\"4\"/><path d=\"M2 21v-3a7 7 0 0 1 14 0v3H2ZM16 5a4 4 0 0 1 0 7M18 15a6 6 0 0 1 4 6\"/>",
  "gift": "<rect x=\"3\" y=\"9\" width=\"18\" height=\"13\" rx=\"2\"/><path d=\"M2 9h20M12 9v13M12 8c-6 0-8-7-3-7 2 0 3 3 3 7Zm0 0c6 0 8-7 3-7-2 0-3 3-3 7Z\"/>",
  "star": "<path d=\"m12 2 3 7 7 .8-5.5 5 1.5 7-6-3.7-6 3.7 1.5-7L2 9.8 9 9l3-7Z\"/>",
  "sun": "<circle cx=\"12\" cy=\"12\" r=\"5\"/><path d=\"M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2\"/>",
  "cloud": "<path d=\"M7 20h11a5 5 0 0 0 1-10 7 7 0 0 0-14-1A5 5 0 0 0 7 20Z\"/>",
  "rain": "<path d=\"M7 16h11a5 5 0 0 0 1-10 7 7 0 0 0-14-1A5 5 0 0 0 7 16ZM6 19l-1 3M12 19l-1 3M18 19l-1 3\"/>",
  "tree": "<path d=\"m12 2 7 9h-3l5 7H3l5-7H5l7-9ZM12 18v4\"/>",
  "tent": "<path d=\"m12 2 10 19H2L12 2ZM12 2v19M8 21l4-7 4 7\"/>",
  "umbrella": "<path d=\"M2 12a10 10 0 0 1 20 0H2ZM12 12v7a3 3 0 0 0 6 0\"/>",
  "shield": "<path d=\"m12 2 9 4v6c0 6-4 9-9 10-5-1-9-4-9-10V6l9-4Z\"/><path d=\"m8 12 3 3 5-6\"/>",
  "lock": "<rect x=\"5\" y=\"10\" width=\"14\" height=\"12\" rx=\"2\"/><path d=\"M8 10V7a4 4 0 0 1 8 0v3M12 15v3\"/>",
  "bell": "<path d=\"M5 18h14l-2-3V9a5 5 0 0 0-10 0v6l-2 3ZM10 21h4\"/>",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 6v6l4 2\"/>",
  "calendar": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M7 2v6M17 2v6M3 11h18M8 15h3M14 15h3\"/>",
  "target": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/>",
  "trophy": "<path d=\"M7 3h10v9a5 5 0 0 1-10 0V3ZM7 5H3v3a5 5 0 0 0 5 5M17 5h4v3a5 5 0 0 1-5 5M12 17v4M7 21h10\"/>",
  "flag": "<path d=\"M5 22V3M5 4c5-3 7 3 14 0v11c-7 3-9-3-14 0\"/>",
  "sparkles": "<path d=\"m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2ZM20 2v4M18 4h4\"/>",
  "globe": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M2 12h20M12 2c-7 8-7 12 0 20M12 2c7 8 7 12 0 20\"/>",
  "link": "<path d=\"M9 14 15 8M8 10l-2 2a4 4 0 0 0 6 6l2-2M16 14l2-2a4 4 0 0 0-6-6l-2 2\"/>",
  "smile": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M8 10h.01M16 10h.01M7 15c3 4 7 4 10 0\"/>",
  "brush": "<path d=\"m14 4 6-2 2 2-2 6-9 9-6-6 9-9ZM4 16c-3 1-3 4-2 6 2-1 5-1 6-4\"/>",
  "shirt": "<path d=\"M8 3h8l3 3 3 2-3 5-3-2v10H8V11l-3 2-3-5 3-2 3-3Z\"/>",
  "shoe": "<path d=\"M3 14c3 0 4-3 5-6l5 5 7 2 2 5H2v-4l1-2ZM2 17h20M12 14l1-2M15 15l1-2\"/>",
  "watch": "<circle cx=\"12\" cy=\"12\" r=\"7\"/><path d=\"M9 5V2h6v3M9 19v3h6v-3M12 8v5l3 1\"/>",
  "recycle": "<path d=\"m7 3 3-2 4 6-3 2M14 7h5l3 5-3 4M20 13h3l-4 7h-7M14 20l-2 3-4-6 3-2M8 17H3l-2-5 3-5M4 10 1 8l4-7h5\"/>",
  "package": "<path d=\"m3 7 9-4 9 4v10l-9 5-9-5V7ZM3 7l9 5 9-5M12 12v10M7 5l10 5\"/>",
  "key": "<circle cx=\"8\" cy=\"11\" r=\"5\"/><path d=\"m12 14 9 8M18 19l2-2M15 16l2-2\"/>",
  "backpack": "<rect x=\"5\" y=\"7\" width=\"14\" height=\"15\" rx=\"3\"/><path d=\"M9 7V5a3 3 0 0 1 6 0v2M7 12h10M8 16h8v4H8v-4Z\"/>",
  "languages": "<path d=\"M2 6h14M9 3v3M4 6c0 6 5 10 10 11M13 6c0 5-5 9-9 11M14 21l4-11 4 11M16 17h4\"/>",
  "flower": "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M9 8c-3-6 2-8 3-3 1-5 6-3 3 3 6-3 8 2 3 4 5 1 3 6-3 3 3 6-2 8-3 3-1 5-6 3-3-3-6 3-8-2-3-4-5-1-3-6 3-3-3-6 2-8 3-3Z\"/>",
  "leaf": "<path d=\"M21 3C7 3 3 9 3 16c0 4 3 5 6 5 7 0 12-7 12-18ZM4 20c3-5 7-9 12-12\"/>",
  "battery": "<rect x=\"2\" y=\"7\" width=\"18\" height=\"10\" rx=\"2\"/><path d=\"M22 10v4M5 10h6v4H5z\"/>",
  "router": "<rect x=\"3\" y=\"12\" width=\"18\" height=\"8\" rx=\"2\"/><path d=\"M7 12V7M17 12V7M4 4c4-3 8-3 12 0M10 6c3-2 6-2 9 0M7 16h.01M12 16h.01\"/>",
  "mic": "<rect x=\"9\" y=\"2\" width=\"6\" height=\"13\" rx=\"3\"/><path d=\"M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8\"/>",
  "popcorn": "<path d=\"M4 8h16l-2 14H6L4 8ZM3 8l1-4 4-1 4 2 4-2 4 1 1 4M9 11l1 8M15 11l-1 8\"/>",
  "icecream": "<path d=\"M7 11h10l-5 11-5-11ZM6 10a6 6 0 0 1 12 0H6Z\"/>",
  "fish": "<path d=\"M2 12c7-8 14-8 18 0-4 8-11 8-18 0ZM20 12l3-5v10l-3-5ZM8 10h.01\"/>",
  "bread": "<path d=\"M6 8C5 3 11 1 14 4c6-3 9 4 6 7v10H4V11c-2-1-1-5 2-3Z\"/>",
  "chef-hat": "<path d=\"M5 11c-5-1-4-9 2-9 2 0 3 1 5 3 2-2 3-3 5-3 6 0 7 8 2 9v9H5v-9ZM5 16h14\"/>",
  "house-plus": "<path d=\"m3 11 9-8 9 8M5 10v11h14V10M12 12v7M8.5 15.5h7\"/>"
};
  const SECCIONES = [
  {
    "nombre": "Favoritos",
    "items": [
      {
        "nombre": "Etiqueta",
        "clave": "tag",
        "busqueda": "otro otros"
      },
      {
        "nombre": "Estrella",
        "clave": "star",
        "busqueda": "favorito"
      },
      {
        "nombre": "Casa",
        "clave": "home",
        "busqueda": "hogar vivienda"
      },
      {
        "nombre": "Comida",
        "clave": "utensils",
        "busqueda": "restaurante"
      },
      {
        "nombre": "Mercado",
        "clave": "shopping-cart",
        "busqueda": "supermercado"
      },
      {
        "nombre": "Transporte",
        "clave": "car",
        "busqueda": "vehículo"
      },
      {
        "nombre": "Salud",
        "clave": "heart",
        "busqueda": "bienestar"
      },
      {
        "nombre": "Educación",
        "clave": "book",
        "busqueda": "estudios"
      },
      {
        "nombre": "Ahorro",
        "clave": "piggy-bank",
        "busqueda": "alcancía"
      },
      {
        "nombre": "Trabajo",
        "clave": "briefcase",
        "busqueda": "empleo"
      },
      {
        "nombre": "Regalo",
        "clave": "gift",
        "busqueda": "cumpleaños"
      },
      {
        "nombre": "Cuentas",
        "clave": "wallet",
        "busqueda": "dinero"
      }
    ]
  },
  {
    "nombre": "Comida y bebidas",
    "items": [
      {
        "nombre": "Restaurante",
        "clave": "utensils",
        "busqueda": "almuerzo comida"
      },
      {
        "nombre": "Café",
        "clave": "coffee",
        "busqueda": "cafetería"
      },
      {
        "nombre": "Pizza",
        "clave": "pizza",
        "busqueda": "pizzería"
      },
      {
        "nombre": "Hamburguesa",
        "clave": "burger",
        "busqueda": "comida rápida"
      },
      {
        "nombre": "Pastel",
        "clave": "cake",
        "busqueda": "postre torta"
      },
      {
        "nombre": "Manzana",
        "clave": "apple",
        "busqueda": "fruta"
      },
      {
        "nombre": "Verduras",
        "clave": "carrot",
        "busqueda": "vegetales"
      },
      {
        "nombre": "Agua",
        "clave": "glass-water",
        "busqueda": "bebida"
      },
      {
        "nombre": "Vino",
        "clave": "wine",
        "busqueda": "copa"
      },
      {
        "nombre": "Cerveza",
        "clave": "beer",
        "busqueda": "botella"
      },
      {
        "nombre": "Helado",
        "clave": "icecream",
        "busqueda": "postres"
      },
      {
        "nombre": "Pan",
        "clave": "bread",
        "busqueda": "panadería"
      },
      {
        "nombre": "Pescado",
        "clave": "fish",
        "busqueda": "pescadería"
      },
      {
        "nombre": "Cocina",
        "clave": "chef-hat",
        "busqueda": "chef"
      },
      {
        "nombre": "Mercado",
        "clave": "basket",
        "busqueda": "compras"
      },
      {
        "nombre": "Comida a domicilio",
        "clave": "shopping-bag",
        "busqueda": "delivery"
      }
    ]
  },
  {
    "nombre": "Transporte y viajes",
    "items": [
      {
        "nombre": "Carro",
        "clave": "car",
        "busqueda": "auto coche"
      },
      {
        "nombre": "Bus",
        "clave": "bus",
        "busqueda": "transporte público"
      },
      {
        "nombre": "Bicicleta",
        "clave": "bike",
        "busqueda": "ciclismo"
      },
      {
        "nombre": "Motocicleta",
        "clave": "motorcycle",
        "busqueda": "moto"
      },
      {
        "nombre": "Avión",
        "clave": "plane",
        "busqueda": "vuelo"
      },
      {
        "nombre": "Tren",
        "clave": "train",
        "busqueda": "metro"
      },
      {
        "nombre": "Barco",
        "clave": "ship",
        "busqueda": "crucero"
      },
      {
        "nombre": "Camión",
        "clave": "truck",
        "busqueda": "mudanza"
      },
      {
        "nombre": "Gasolina",
        "clave": "fuel",
        "busqueda": "combustible"
      },
      {
        "nombre": "Taxi",
        "clave": "taxi",
        "busqueda": "uber"
      },
      {
        "nombre": "Destino",
        "clave": "map-pin",
        "busqueda": "ubicación"
      },
      {
        "nombre": "Viajes",
        "clave": "globe",
        "busqueda": "turismo"
      }
    ]
  },
  {
    "nombre": "Hogar y servicios",
    "items": [
      {
        "nombre": "Hogar",
        "clave": "home",
        "busqueda": "casa"
      },
      {
        "nombre": "Sofá",
        "clave": "sofa",
        "busqueda": "muebles"
      },
      {
        "nombre": "Cama",
        "clave": "bed",
        "busqueda": "habitación"
      },
      {
        "nombre": "Electricidad",
        "clave": "lightbulb",
        "busqueda": "luz"
      },
      {
        "nombre": "Agua",
        "clave": "droplet",
        "busqueda": "acueducto"
      },
      {
        "nombre": "Gas",
        "clave": "flame",
        "busqueda": "fuego"
      },
      {
        "nombre": "Reparaciones",
        "clave": "wrench",
        "busqueda": "herramientas"
      },
      {
        "nombre": "Limpieza",
        "clave": "broom",
        "busqueda": "aseo"
      },
      {
        "nombre": "Lavadora",
        "clave": "washing-machine",
        "busqueda": "lavandería"
      },
      {
        "nombre": "Alquiler",
        "clave": "key",
        "busqueda": "arriendo"
      },
      {
        "nombre": "Nuevo hogar",
        "clave": "house-plus",
        "busqueda": "vivienda"
      },
      {
        "nombre": "Reciclaje",
        "clave": "recycle",
        "busqueda": "residuos"
      }
    ]
  },
  {
    "nombre": "Finanzas",
    "items": [
      {
        "nombre": "Billetera",
        "clave": "wallet",
        "busqueda": "cartera"
      },
      {
        "nombre": "Tarjeta",
        "clave": "credit-card",
        "busqueda": "débito crédito"
      },
      {
        "nombre": "Banco",
        "clave": "bank",
        "busqueda": "cuenta bancaria"
      },
      {
        "nombre": "Dinero",
        "clave": "money",
        "busqueda": "billete efectivo"
      },
      {
        "nombre": "Monedas",
        "clave": "coins",
        "busqueda": "centavos"
      },
      {
        "nombre": "Ahorro",
        "clave": "piggy-bank",
        "busqueda": "alcancía"
      },
      {
        "nombre": "Inversión",
        "clave": "chart-line",
        "busqueda": "bolsa"
      },
      {
        "nombre": "Estadísticas",
        "clave": "chart-bar",
        "busqueda": "reportes"
      },
      {
        "nombre": "Calculadora",
        "clave": "calculator",
        "busqueda": "contabilidad"
      },
      {
        "nombre": "Préstamos",
        "clave": "hand-coins",
        "busqueda": "deuda"
      },
      {
        "nombre": "Factura",
        "clave": "receipt",
        "busqueda": "recibo"
      },
      {
        "nombre": "Meta financiera",
        "clave": "target",
        "busqueda": "objetivo"
      }
    ]
  },
  {
    "nombre": "Salud y deporte",
    "items": [
      {
        "nombre": "Corazón",
        "clave": "heart",
        "busqueda": "salud"
      },
      {
        "nombre": "Botiquín",
        "clave": "first-aid",
        "busqueda": "primeros auxilios"
      },
      {
        "nombre": "Pastilla",
        "clave": "pill",
        "busqueda": "medicamentos medicina"
      },
      {
        "nombre": "Médico",
        "clave": "stethoscope",
        "busqueda": "doctor"
      },
      {
        "nombre": "Dentista",
        "clave": "tooth",
        "busqueda": "odontología"
      },
      {
        "nombre": "Peluquería",
        "clave": "scissors",
        "busqueda": "estética"
      },
      {
        "nombre": "Pesas",
        "clave": "dumbbell",
        "busqueda": "gimnasio"
      },
      {
        "nombre": "Correr",
        "clave": "running",
        "busqueda": "atletismo"
      },
      {
        "nombre": "Bienestar",
        "clave": "smile",
        "busqueda": "felicidad"
      },
      {
        "nombre": "Protección",
        "clave": "shield",
        "busqueda": "seguro"
      }
    ]
  },
  {
    "nombre": "Tecnología",
    "items": [
      {
        "nombre": "Portátil",
        "clave": "laptop",
        "busqueda": "computador"
      },
      {
        "nombre": "PC",
        "clave": "monitor",
        "busqueda": "pantalla"
      },
      {
        "nombre": "Celular",
        "clave": "smartphone",
        "busqueda": "móvil"
      },
      {
        "nombre": "Televisión",
        "clave": "tv",
        "busqueda": "televisor"
      },
      {
        "nombre": "Audífonos",
        "clave": "headphones",
        "busqueda": "audio"
      },
      {
        "nombre": "Cámara",
        "clave": "camera",
        "busqueda": "fotos"
      },
      {
        "nombre": "Internet",
        "clave": "wifi",
        "busqueda": "red"
      },
      {
        "nombre": "Impresora",
        "clave": "printer",
        "busqueda": "papel"
      },
      {
        "nombre": "Videojuegos",
        "clave": "gamepad",
        "busqueda": "consola"
      },
      {
        "nombre": "Batería",
        "clave": "battery",
        "busqueda": "energía"
      },
      {
        "nombre": "Router",
        "clave": "router",
        "busqueda": "módem"
      }
    ]
  },
  {
    "nombre": "Estudios y trabajo",
    "items": [
      {
        "nombre": "Libro",
        "clave": "book",
        "busqueda": "lectura"
      },
      {
        "nombre": "Universidad",
        "clave": "graduation-cap",
        "busqueda": "diploma grado"
      },
      {
        "nombre": "Colegio",
        "clave": "school",
        "busqueda": "aula"
      },
      {
        "nombre": "Lápiz",
        "clave": "pencil",
        "busqueda": "escritura"
      },
      {
        "nombre": "Trabajo",
        "clave": "briefcase",
        "busqueda": "oficina"
      },
      {
        "nombre": "Morral",
        "clave": "backpack",
        "busqueda": "mochila"
      },
      {
        "nombre": "Idiomas",
        "clave": "languages",
        "busqueda": "traducción"
      },
      {
        "nombre": "Objetivo",
        "clave": "target",
        "busqueda": "meta"
      },
      {
        "nombre": "Trofeo",
        "clave": "trophy",
        "busqueda": "premio"
      },
      {
        "nombre": "Calendario",
        "clave": "calendar",
        "busqueda": "agenda"
      }
    ]
  },
  {
    "nombre": "Entretenimiento",
    "items": [
      {
        "nombre": "Juegos",
        "clave": "gamepad",
        "busqueda": "gaming"
      },
      {
        "nombre": "Música",
        "clave": "music",
        "busqueda": "canciones"
      },
      {
        "nombre": "Cine",
        "clave": "film",
        "busqueda": "películas"
      },
      {
        "nombre": "Boletas",
        "clave": "ticket",
        "busqueda": "entrada evento"
      },
      {
        "nombre": "Micrófono",
        "clave": "mic",
        "busqueda": "podcast"
      },
      {
        "nombre": "Palomitas",
        "clave": "popcorn",
        "busqueda": "snacks"
      },
      {
        "nombre": "Televisión",
        "clave": "tv",
        "busqueda": "series"
      },
      {
        "nombre": "Cámara",
        "clave": "camera",
        "busqueda": "fotografía"
      },
      {
        "nombre": "Estrella",
        "clave": "star",
        "busqueda": "fama"
      }
    ]
  },
  {
    "nombre": "Familia y mascotas",
    "items": [
      {
        "nombre": "Familia",
        "clave": "users",
        "busqueda": "personas"
      },
      {
        "nombre": "Bebé",
        "clave": "baby",
        "busqueda": "niño"
      },
      {
        "nombre": "Perro",
        "clave": "dog",
        "busqueda": "mascota"
      },
      {
        "nombre": "Gato",
        "clave": "cat",
        "busqueda": "felino"
      },
      {
        "nombre": "Huellas",
        "clave": "paw",
        "busqueda": "animal"
      },
      {
        "nombre": "Regalos",
        "clave": "gift",
        "busqueda": "detalle"
      },
      {
        "nombre": "Amor",
        "clave": "heart",
        "busqueda": "pareja"
      },
      {
        "nombre": "Flores",
        "clave": "flower",
        "busqueda": "jardín"
      }
    ]
  },
  {
    "nombre": "Ropa y compras",
    "items": [
      {
        "nombre": "Ropa",
        "clave": "shirt",
        "busqueda": "camiseta"
      },
      {
        "nombre": "Zapatos",
        "clave": "shoe",
        "busqueda": "calzado"
      },
      {
        "nombre": "Compras",
        "clave": "shopping-bag",
        "busqueda": "tienda"
      },
      {
        "nombre": "Supermercado",
        "clave": "shopping-cart",
        "busqueda": "mercado"
      },
      {
        "nombre": "Reloj",
        "clave": "watch",
        "busqueda": "accesorios"
      },
      {
        "nombre": "Bolso",
        "clave": "basket",
        "busqueda": "canasta"
      },
      {
        "nombre": "Paquete",
        "clave": "package",
        "busqueda": "envío"
      }
    ]
  },
  {
    "nombre": "Naturaleza y otros",
    "items": [
      {
        "nombre": "Sol",
        "clave": "sun",
        "busqueda": "día"
      },
      {
        "nombre": "Nube",
        "clave": "cloud",
        "busqueda": "cielo"
      },
      {
        "nombre": "Lluvia",
        "clave": "rain",
        "busqueda": "clima"
      },
      {
        "nombre": "Árbol",
        "clave": "tree",
        "busqueda": "bosque"
      },
      {
        "nombre": "Camping",
        "clave": "tent",
        "busqueda": "carpa"
      },
      {
        "nombre": "Paraguas",
        "clave": "umbrella",
        "busqueda": "sombrilla"
      },
      {
        "nombre": "Hoja",
        "clave": "leaf",
        "busqueda": "naturaleza"
      },
      {
        "nombre": "Seguridad",
        "clave": "lock",
        "busqueda": "contraseña"
      },
      {
        "nombre": "Notificación",
        "clave": "bell",
        "busqueda": "alarma"
      },
      {
        "nombre": "Tiempo",
        "clave": "clock",
        "busqueda": "hora"
      },
      {
        "nombre": "Bandera",
        "clave": "flag",
        "busqueda": "objetivo"
      },
      {
        "nombre": "Celebración",
        "clave": "sparkles",
        "busqueda": "fiesta"
      },
      {
        "nombre": "Mundo",
        "clave": "globe",
        "busqueda": "viaje"
      },
      {
        "nombre": "Enlace",
        "clave": "link",
        "busqueda": "internet"
      },
      {
        "nombre": "Arte",
        "clave": "brush",
        "busqueda": "pintura"
      }
    ]
  }
];
  const ANTIGUOS = {
  "ph-tag": "tag",
  "ph-fork-knife": "utensils",
  "ph-bowl-food": "utensils",
  "ph-coffee": "coffee",
  "ph-cooking-pot": "chef-hat",
  "ph-beer-bottle": "beer",
  "ph-wine": "wine",
  "ph-hamburger": "burger",
  "ph-pizza": "pizza",
  "ph-cake": "cake",
  "ph-cookie": "cake",
  "ph-carrot": "carrot",
  "ph-apple-logo": "apple",
  "ph-car": "car",
  "ph-bus": "bus",
  "ph-bicycle": "bike",
  "ph-motorbike": "motorcycle",
  "ph-airplane": "plane",
  "ph-train": "train",
  "ph-taxi": "taxi",
  "ph-gas-pump": "fuel",
  "ph-ship": "ship",
  "ph-truck": "truck",
  "ph-house": "home",
  "ph-shopping-cart": "shopping-cart",
  "ph-shopping-bag": "shopping-bag",
  "ph-t-shirt": "shirt",
  "ph-sneaker": "shoe",
  "ph-washing-machine": "washing-machine",
  "ph-couch": "sofa",
  "ph-lightbulb": "lightbulb",
  "ph-drop": "droplet",
  "ph-fire": "flame",
  "ph-heartbeat": "heart",
  "ph-first-aid": "first-aid",
  "ph-pill": "pill",
  "ph-stethoscope": "stethoscope",
  "ph-tooth": "tooth",
  "ph-scissors": "scissors",
  "ph-barbell": "dumbbell",
  "ph-person-simple-run": "running",
  "ph-devices": "laptop",
  "ph-laptop": "laptop",
  "ph-device-mobile": "smartphone",
  "ph-game-controller": "gamepad",
  "ph-music-notes": "music",
  "ph-film-slate": "film",
  "ph-tv": "tv",
  "ph-headphones": "headphones",
  "ph-camera": "camera",
  "ph-book-open": "book",
  "ph-money": "money",
  "ph-credit-card": "credit-card",
  "ph-bank": "bank",
  "ph-wallet": "wallet",
  "ph-briefcase": "briefcase",
  "ph-chart-line-up": "chart-line",
  "ph-piggy-bank": "piggy-bank",
  "ph-receipt": "receipt",
  "ph-hand-coins": "hand-coins",
  "ph-coin": "coins",
  "ph-users": "users",
  "ph-baby": "baby",
  "ph-dog": "dog",
  "ph-cat": "cat",
  "ph-paw-print": "paw",
  "ph-gift": "gift",
  "ph-target": "target",
  "ph-star": "star",
  "ph-flag": "flag",
  "ph-trophy": "trophy",
  "ph-medal": "trophy",
  "ph-tent": "tent",
  "ph-tree": "tree",
  "ph-umbrella": "umbrella",
  "ph-sun": "sun"
};

  const FALLBACK = 'tag';
  function normalizar(clave) {
    if (typeof clave !== 'string') return FALLBACK;
    const valor = clave.trim();
    if (valor.startsWith('fi:')) {
      const real = valor.slice(3);
      return Object.prototype.hasOwnProperty.call(DIBUJOS, real) ? real : FALLBACK;
    }
    if (Object.prototype.hasOwnProperty.call(DIBUJOS, valor)) return valor;
    return ANTIGUOS[valor] || FALLBACK;
  }
  function html(clave, clase = '') {
    const key = normalizar(clave);
    const claseSegura = /^[\w -]{0,60}$/.test(clase) ? clase : '';
    return '<svg class="fi-svg ' + claseSegura + '" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + DIBUJOS[key] + '</svg>';
  }
  let filtro = 'Todos';
  let busqueda = '';
  let actual = FALLBACK;
  let ultimoFoco = null;

  function elementos() {
    return {
      modal: document.getElementById('selectorIconosModal'),
      lista: document.getElementById('listaIconosCategoria'),
      boton: document.getElementById('btnMostrarIconos'),
      valor: document.getElementById('iconoCategoria'),
      cerrar: document.getElementById('btnCerrarSelectorIconos')
    };
  }

  function actualizarVistaPrevia(valor) {
    const { boton, valor: input } = elementos();
    if (!boton) return;
    const nombre = normalizar(valor || (input && input.value));
    const encontrado = SECCIONES.flatMap(s => s.items).find(i => i.clave === nombre);
    const titulo = encontrado ? encontrado.nombre : 'Elegir ícono';
    boton.innerHTML = '<span class="fi-preview-burbuja">' + html('fi:' + nombre) + '</span><span class="fi-preview-texto"><strong>' + titulo + '</strong><small>Toca para explorar más de ' + SECCIONES.reduce((n, s) => n + s.items.length, 0) + ' opciones</small></span><span class="fi-preview-chevron">›</span>';
    actualizarColor(document.getElementById('colorCategoria')?.value || '#e8c84c');
    boton.setAttribute('aria-label', 'Elegir ícono de la categoría');
    boton.setAttribute('aria-haspopup', 'dialog');
    boton.setAttribute('aria-controls', 'selectorIconosModal');
  }
  function actualizarColor(color) {
    const bubble = elementos().boton?.querySelector('.fi-preview-burbuja');
    if (!bubble) return;
    bubble.style.backgroundColor = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#e8c84c';
    bubble.style.color = '#26221a';
  }
  function establecer(valor) {
    const { valor: input } = elementos();
    if (!input) return;
    const key = normalizar(valor);
    input.value = 'fi:' + key;
    actual = key;
    actualizarVistaPrevia(input.value);
  }
  function todasOpciones() {
    return SECCIONES.flatMap(s => s.items.map(i => Object.assign({seccion: s.nombre}, i)));
  }
  function normalizarTexto(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  function dibujarLista() {
    const { lista } = elementos();
    if (!lista) return;
    const filtroTexto = normalizarTexto(busqueda);
    const items = todasOpciones().filter(i => (filtro === 'Todos' || i.seccion === filtro) && normalizarTexto(i.nombre + ' ' + i.busqueda + ' ' + i.seccion).includes(filtroTexto));
    const contador = document.getElementById('fiContador');
    if (contador) contador.textContent = items.length + ' íconos disponibles';
    if (!items.length) {
      lista.innerHTML = '<div class="fi-sin-resultados">' + html('fi:tag') + '<strong>No encontramos ese ícono</strong><span>Intenta otra palabra o cambia el filtro.</span></div>';
      return;
    }
    // Solo el catalogo fijo ingresa en innerHTML; la busqueda del usuario no se inserta como HTML.
    lista.innerHTML = items.map(i => '<button type="button" class="fi-item ' + (i.clave === actual ? 'fi-selected' : '') + '" data-fi="' + i.clave + '" aria-label="Elegir ' + i.nombre + '" aria-pressed="' + (i.clave === actual) + '"><span class="fi-item-circle">' + html('fi:' + i.clave) + '</span><span class="fi-item-name">' + i.nombre + '</span></button>').join('');
  }
  function actualizarChips() {
    const cont = document.getElementById('fiFiltros');
    if (!cont) return;
    cont.innerHTML = ['Todos', ...SECCIONES.map(s => s.nombre)].map(s => '<button type="button" class="fi-filtro ' + (s === filtro ? 'active' : '') + '" data-filtro="' + s + '" aria-pressed="' + (s === filtro) + '">' + s + '</button>').join('');
  }
  function cerrarSelector() {
    const { modal, boton } = elementos();
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('fi-modal-open');
    if (boton) boton.focus();
    else if (ultimoFoco && document.contains(ultimoFoco)) ultimoFoco.focus();
  }
  function abrirSelector() {
    const { modal, valor } = elementos();
    if (!modal || !valor) return;
    ultimoFoco = document.activeElement;
    actual = normalizar(valor.value);
    filtro = 'Todos'; busqueda = '';
    const buscar = document.getElementById('fiBuscar');
    if (buscar) buscar.value = '';
    actualizarChips(); dibujarLista();
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('fi-modal-open');
    if (buscar) buscar.focus();
  }
  function iniciar() {
    const {modal, lista, boton, cerrar, valor} = elementos();
    if (!modal || !lista || !boton || !valor || modal.dataset.fiListo === '1') return;
    modal.dataset.fiListo = '1';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Seleccionar ícono de categoría');
    modal.setAttribute('aria-hidden', 'true');
    const header = modal.querySelector('.selector-iconos-header');
    if (header) {
      header.innerHTML = '<div class="fi-modal-top"><div class="fi-modal-identity"><span class="fi-modal-avatar">' + html('fi:sparkles') + '</span><div><strong>Elige tu ícono</strong><span>Personaliza tus categorías</span></div></div><button id="btnCerrarSelectorIconos" type="button" class="fi-close" aria-label="Cerrar selector">×</button></div><div class="fi-search-wrap">' + html('fi:tag') + '<input id="fiBuscar" type="search" placeholder="Buscar: comida, moto, Netflix..." autocomplete="off" aria-label="Buscar íconos"><span class="fi-search-shortcut">⌕</span></div><div class="fi-meta"><span id="fiContador"></span><span>SVG · sin conexión</span></div><div id="fiFiltros" class="fi-filtros" aria-label="Filtrar íconos"></div>';
    }
    // El header se reconstruye; escuchar el nuevo boton, no el antiguo.
    modal.querySelector('#btnCerrarSelectorIconos')?.addEventListener('click', cerrarSelector);
    document.getElementById('fiBuscar')?.addEventListener('input', e => {busqueda = e.target.value; dibujarLista();});
    document.getElementById('fiFiltros')?.addEventListener('click', e => {
      const b = e.target.closest('[data-filtro]'); if (!b) return;
      filtro = b.dataset.filtro; actualizarChips(); dibujarLista();
    });
    lista.addEventListener('click', e => {
      const b = e.target.closest('[data-fi]'); if (!b) return;
      establecer('fi:' + b.dataset.fi);
      cerrarSelector();
    });
    boton.addEventListener('click', abrirSelector);
    modal.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); cerrarSelector(); }
      if (e.key === 'Tab') {
        const focos = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled])')].filter(x => x.getClientRects().length);
        if (!focos.length) return;
        const primero = focos[0], ultimo = focos[focos.length - 1];
        if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) {e.preventDefault(); primero.focus();}
      }
    });
    actualizarVistaPrevia(valor.value);
  }
  App.Iconos = Object.freeze({html, normalizar, establecer, actualizarColor, actualizarVistaPrevia, abrirSelector, iniciar, total: todasOpciones().length, secciones: SECCIONES.length});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
