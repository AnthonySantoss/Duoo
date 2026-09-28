package com.duoo.capture

data class CapturedTransaction(
    val externalId: String,
    val title: String,
    val amount: Double,
    val type: String,
    val sourcePackage: String,
    val confidence: Double,
    val sourceType: String
)
