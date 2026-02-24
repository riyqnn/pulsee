export const IDL = {
  "address": "EXZ9u1aF8gvHeUsKM8eTRzWDo88WGMKWZJLbvM8bYetJ",
  "metadata": {
    "name": "pulse",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "activate_agent",
      "docs": [
        "=====================================",
        "AGENT CONTROL INSTRUCTIONS",
        "====================================="
      ],
      "discriminator": [
        252,
        139,
        87,
        21,
        195,
        152,
        29,
        217
      ],
      "accounts": [
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "agent.agent_id",
                "account": "AIAgent"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "add_agent_budget",
      "discriminator": [
        185,
        104,
        153,
        32,
        53,
        77,
        186,
        55
      ],
      "accounts": [
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "agent.agent_id",
                "account": "AIAgent"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "buy_ticket_with_escrow",
      "docs": [
        "=====================================",
        "CORE FUNCTION: BUY TICKET WITH AGENT ESCROW",
        "====================================="
      ],
      "discriminator": [
        68,
        93,
        104,
        222,
        62,
        228,
        210,
        154
      ],
      "accounts": [
        {
          "name": "event",
          "writable": true
        },
        {
          "name": "tier",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  105,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "event"
              },
              {
                "kind": "arg",
                "path": "tier_id"
              }
            ]
          }
        },
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agent_owner"
              },
              {
                "kind": "account",
                "path": "agent.agent_id",
                "account": "AIAgent"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              },
              {
                "kind": "arg",
                "path": "agent_owner"
              }
            ]
          }
        },
        {
          "name": "organizer",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "tier_id",
          "type": "string"
        },
        {
          "name": "agent_owner",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "create_ai_agent",
      "docs": [
        "=====================================",
        "AI AGENT INSTRUCTIONS",
        "====================================="
      ],
      "discriminator": [
        80,
        103,
        91,
        143,
        24,
        215,
        153,
        201
      ],
      "accounts": [
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "agent_id"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "agent_id",
          "type": "string"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "max_budget_per_ticket",
          "type": "u64"
        },
        {
          "name": "total_budget",
          "type": "u64"
        },
        {
          "name": "auto_purchase_enabled",
          "type": "bool"
        },
        {
          "name": "auto_purchase_threshold",
          "type": "u16"
        },
        {
          "name": "max_tickets_per_event",
          "type": "u32"
        }
      ]
    },
    {
      "name": "create_escrow",
      "docs": [
        "=====================================",
        "ESCROW INSTRUCTIONS",
        "====================================="
      ],
      "discriminator": [
        253,
        215,
        165,
        116,
        36,
        108,
        68,
        80
      ],
      "accounts": [
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "agent.agent_id",
                "account": "AIAgent"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "create_event",
      "docs": [
        "=====================================",
        "EVENT INSTRUCTIONS",
        "====================================="
      ],
      "discriminator": [
        49,
        219,
        29,
        203,
        22,
        98,
        100,
        87
      ],
      "accounts": [
        {
          "name": "event",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  118,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "organizer"
              },
              {
                "kind": "arg",
                "path": "event_id"
              }
            ]
          }
        },
        {
          "name": "organizer",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "event_id",
          "type": "string"
        },
        {
          "name": "organizer_fee_bps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "create_ticket_tier",
      "docs": [
        "=====================================",
        "TICKET TIER INSTRUCTIONS",
        "====================================="
      ],
      "discriminator": [
        80,
        67,
        79,
        51,
        252,
        196,
        5,
        45
      ],
      "accounts": [
        {
          "name": "event"
        },
        {
          "name": "tier",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  105,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "event"
              },
              {
                "kind": "arg",
                "path": "tier_id"
              }
            ]
          }
        },
        {
          "name": "organizer",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "tier_id",
          "type": "string"
        },
        {
          "name": "price",
          "type": "u64"
        },
        {
          "name": "max_supply",
          "type": "u64"
        }
      ]
    },
    {
      "name": "deactivate_agent",
      "discriminator": [
        205,
        171,
        239,
        225,
        82,
        126,
        96,
        166
      ],
      "accounts": [
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "agent.agent_id",
                "account": "AIAgent"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "deposit_to_escrow",
      "discriminator": [
        246,
        134,
        57,
        199,
        116,
        101,
        68,
        224
      ],
      "accounts": [
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "agent"
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "toggle_auto_purchase",
      "discriminator": [
        162,
        243,
        245,
        180,
        170,
        74,
        223,
        227
      ],
      "accounts": [
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "agent.agent_id",
                "account": "AIAgent"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "enabled",
          "type": "bool"
        }
      ]
    },
    {
      "name": "update_agent_config",
      "discriminator": [
        232,
        239,
        83,
        133,
        24,
        49,
        84,
        76
      ],
      "accounts": [
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "agent.agent_id",
                "account": "AIAgent"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "max_budget_per_ticket",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "auto_purchase_threshold",
          "type": {
            "option": "u16"
          }
        }
      ]
    },
    {
      "name": "withdraw_from_escrow",
      "discriminator": [
        235,
        206,
        216,
        253,
        47,
        163,
        169,
        231
      ],
      "accounts": [
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "agent"
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "AIAgent",
      "discriminator": [
        235,
        115,
        232,
        223,
        99,
        222,
        244,
        129
      ]
    },
    {
      "name": "AgentEscrow",
      "discriminator": [
        26,
        63,
        32,
        229,
        41,
        3,
        31,
        173
      ]
    },
    {
      "name": "Event",
      "discriminator": [
        125,
        192,
        125,
        158,
        9,
        115,
        152,
        233
      ]
    },
    {
      "name": "TicketTier",
      "discriminator": [
        123,
        241,
        89,
        61,
        59,
        46,
        145,
        242
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidInput",
      "msg": "Invalid input"
    },
    {
      "code": 6001,
      "name": "InvalidFeeBps",
      "msg": "Invalid fee basis points - must be 0-10000"
    },
    {
      "code": 6002,
      "name": "EventNotActive",
      "msg": "Event is not active"
    },
    {
      "code": 6003,
      "name": "InvalidPrice",
      "msg": "Invalid price"
    },
    {
      "code": 6004,
      "name": "InvalidSupply",
      "msg": "Invalid supply"
    },
    {
      "code": 6005,
      "name": "InvalidBudget",
      "msg": "Invalid budget"
    },
    {
      "code": 6006,
      "name": "Unauthorized",
      "msg": "Unauthorized access"
    },
    {
      "code": 6007,
      "name": "AgentInactive",
      "msg": "Agent is inactive"
    },
    {
      "code": 6008,
      "name": "AutoPurchaseDisabled",
      "msg": "Auto-purchase is not enabled for this agent"
    },
    {
      "code": 6009,
      "name": "InsufficientAgentBudget",
      "msg": "Insufficient agent budget"
    },
    {
      "code": 6010,
      "name": "TierSoldOut",
      "msg": "Tier is sold out"
    },
    {
      "code": 6011,
      "name": "TierNotActive",
      "msg": "Tier is not active"
    },
    {
      "code": 6012,
      "name": "InsufficientEscrowBalance",
      "msg": "Insufficient escrow balance"
    },
    {
      "code": 6013,
      "name": "MathOverflow",
      "msg": "Math operation overflow"
    },
    {
      "code": 6014,
      "name": "MathUnderflow",
      "msg": "Math operation underflow"
    }
  ],
  "types": [
    {
      "name": "AIAgent",
      "docs": [
        "=====================================",
        "AI AGENT (Simplified)",
        "====================================="
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "agent_id",
            "type": "string"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "is_active",
            "type": "bool"
          },
          {
            "name": "auto_purchase_enabled",
            "type": "bool"
          },
          {
            "name": "auto_purchase_threshold",
            "type": "u16"
          },
          {
            "name": "max_budget_per_ticket",
            "type": "u64"
          },
          {
            "name": "total_budget",
            "type": "u64"
          },
          {
            "name": "spent_budget",
            "type": "u64"
          },
          {
            "name": "max_tickets_per_event",
            "type": "u32"
          },
          {
            "name": "tickets_purchased",
            "type": "u64"
          },
          {
            "name": "created_at",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "AgentEscrow",
      "docs": [
        "=====================================",
        "AGENT ESCROW",
        "====================================="
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "balance",
            "type": "u64"
          },
          {
            "name": "total_deposited",
            "type": "u64"
          },
          {
            "name": "total_withdrawn",
            "type": "u64"
          },
          {
            "name": "total_spent",
            "type": "u64"
          },
          {
            "name": "created_at",
            "type": "i64"
          },
          {
            "name": "last_activity",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "Event",
      "docs": [
        "=====================================",
        "EVENT (Minimal - rest offchain in Supabase)",
        "====================================="
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organizer",
            "type": "pubkey"
          },
          {
            "name": "event_id",
            "type": "string"
          },
          {
            "name": "organizer_fee_bps",
            "type": "u16"
          },
          {
            "name": "total_tickets_sold",
            "type": "u64"
          },
          {
            "name": "total_revenue",
            "type": "u64"
          },
          {
            "name": "is_active",
            "type": "bool"
          },
          {
            "name": "created_at",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "TicketTier",
      "docs": [
        "=====================================",
        "TICKET TIER",
        "====================================="
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "event",
            "type": "pubkey"
          },
          {
            "name": "tier_id",
            "type": "string"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "max_supply",
            "type": "u64"
          },
          {
            "name": "current_supply",
            "type": "u64"
          },
          {
            "name": "is_active",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
} as const;