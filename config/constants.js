module.exports = {
  RISK_WEIGHTS: {
    WEATHER_SEVERE: 35,
    WEATHER_MODERATE: 15,
    PORT_CONGESTION: 20,
    CARRIER_UNRELIABLE: 15,
    DELAY_HISTORY_HIGH: 20,
    DELAY_HISTORY_MED: 10,
    ROUTE_ACTIVE_DISRUPTION: 25,
  },
  RISK_THRESHOLDS: {
    LOW:    { min: 0,  max: 39, label: 'low',    action: 'monitor' },
    MEDIUM: { min: 40, max: 69, label: 'medium',  action: 'alert'   },
    HIGH:   { min: 70, max: 100,label: 'high',    action: 'reroute' },
  },
  CONGESTED_PORTS:    ['Rotterdam','Shanghai','Dubai','Mumbai','Singapore','Felixstowe'],
  UNRELIABLE_CARRIERS:['MSC','COSCO'],
};