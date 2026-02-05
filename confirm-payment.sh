#!/bin/bash
# Confirm payment intent using Stripe CLI

# Replace with your actual payment intent ID
PAYMENT_INTENT_ID="pi_3SxBph6Lhl4eS4f70qjLh61Q"

# Confirm the payment intent with a test payment method
stripe payment_intents confirm $PAYMENT_INTENT_ID \
  --payment-method=pm_card_visa

echo "Payment intent confirmed! Check your Stripe Dashboard."

