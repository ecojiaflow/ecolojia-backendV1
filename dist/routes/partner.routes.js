"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const track_controller_1 = require("../controllers/track.controller");
const router = express_1.default.Router();
router.get('/track/:id', track_controller_1.trackAffiliateClick);
exports.default = router;
