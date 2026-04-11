//  Los 25 departamentos del Perú
const GRAPH_DATA = {

  nodes: [
    { id: "amazonas",    name: "Chachapoyas",      lat:  -6.232, lng: -77.871 },
    { id: "ancash",      name: "Huaraz",            lat:  -9.527, lng: -77.527 },
    { id: "apurimac",    name: "Abancay",           lat: -13.634, lng: -72.881 },
    { id: "arequipa",    name: "Arequipa",          lat: -16.409, lng: -71.537 },
    { id: "ayacucho",    name: "Ayacucho",          lat: -13.158, lng: -74.223 },
    { id: "cajamarca",   name: "Cajamarca",         lat:  -7.163, lng: -78.500 },
    { id: "callao",      name: "Callao",            lat: -12.056, lng: -77.118 },
    { id: "cusco",       name: "Cusco",             lat: -13.532, lng: -71.967 },
    { id: "huancavelica",name: "Huancavelica",      lat: -12.787, lng: -74.976 },
    { id: "huanuco",     name: "Huánuco",           lat:  -9.930, lng: -76.242 },
    { id: "ica",         name: "Ica",               lat: -14.067, lng: -75.728 },
    { id: "junin",       name: "Huancayo",          lat: -12.065, lng: -75.204 },
    { id: "lalibertad",  name: "Trujillo",          lat:  -8.112, lng: -79.028 },
    { id: "lambayeque",  name: "Chiclayo",          lat:  -6.771, lng: -79.840 },
    { id: "lima",        name: "Lima",              lat: -12.046, lng: -77.042 },
    { id: "loreto",      name: "Iquitos",           lat:  -3.749, lng: -73.253 },
    { id: "madrededios", name: "Pto. Maldonado",    lat: -12.593, lng: -69.189 },
    { id: "moquegua",    name: "Moquegua",          lat: -17.193, lng: -70.935 },
    { id: "pasco",       name: "Cerro de Pasco",    lat: -10.685, lng: -76.262 },
    { id: "piura",       name: "Piura",             lat:  -5.194, lng: -80.632 },
    { id: "puno",        name: "Puno",              lat: -15.840, lng: -70.021 },
    { id: "sanmartin",   name: "Moyobamba",         lat:  -6.034, lng: -76.972 },
    { id: "tacna",       name: "Tacna",             lat: -18.013, lng: -70.251 },
    { id: "tumbes",      name: "Tumbes",            lat:  -3.566, lng: -80.451 },
    { id: "ucayali",     name: "Pucallpa",          lat:  -8.379, lng: -74.553 },
  ],

  edges: [
    // Costa norte
    { from: "tumbes",       to: "piura",          km: 282  },
    { from: "piura",        to: "lambayeque",     km: 209  },
    { from: "lambayeque",   to: "lalibertad",     km: 130  },
    { from: "lalibertad",   to: "ancash",         km: 318  },
    { from: "ancash",       to: "lima",           km: 404  },
    { from: "lima",         to: "callao",         km:  15  },
    { from: "lima",         to: "ica",            km: 306  },
    { from: "ica",          to: "arequipa",       km: 703  },
    { from: "arequipa",     to: "moquegua",       km: 213  },
    { from: "moquegua",     to: "tacna",          km: 158  },

    // Sierra norte
    { from: "tumbes",       to: "piura",          km: 282  },
    { from: "piura",        to: "cajamarca",      km: 430  },
    { from: "lambayeque",   to: "cajamarca",      km: 260  },
    { from: "lalibertad",   to: "cajamarca",      km: 298  },
    { from: "cajamarca",    to: "amazonas",       km: 441  },
    { from: "cajamarca",    to: "ancash",         km: 320  },

    // Sierra centro
    { from: "ancash",       to: "huanuco",        km: 354  },
    { from: "huanuco",      to: "pasco",          km: 130  },
    { from: "pasco",        to: "junin",          km: 130  },
    { from: "lima",         to: "junin",          km: 298  },
    { from: "junin",        to: "huancavelica",   km: 148  },
    { from: "junin",        to: "ayacucho",       km: 312  },
    { from: "huancavelica", to: "ayacucho",       km: 236  },
    { from: "huancavelica", to: "ica",            km: 315  },
    { from: "ayacucho",     to: "apurimac",       km: 357  },
    { from: "ayacucho",     to: "arequipa",       km: 746  },

    // Sierra sur
    { from: "apurimac",     to: "cusco",          km: 193  },
    { from: "cusco",        to: "arequipa",       km: 472  },
    { from: "cusco",        to: "puno",           km: 387  },
    { from: "cusco",        to: "madrededios",    km: 498  },
    { from: "arequipa",     to: "puno",           km: 326  },
    { from: "puno",         to: "moquegua",       km: 297  },
    { from: "puno",         to: "tacna",          km: 393  },
    { from: "madrededios",  to: "puno",           km: 490  },

    // Selva norte
    { from: "amazonas",     to: "sanmartin",      km: 311  },
    { from: "sanmartin",    to: "loreto",         km: 920  },
    { from: "sanmartin",    to: "huanuco",        km: 430  },
    { from: "loreto",       to: "ucayali",        km: 810  },

    // Selva centro
    { from: "ucayali",      to: "huanuco",        km: 420  },
    { from: "ucayali",      to: "madrededios",    km: 690  },
    { from: "ucayali",      to: "junin",          km: 590  },

    // Conexiones adicionales importantes
    { from: "lima",         to: "huanuco",        km: 410  },
    { from: "pasco",        to: "huanuco",        km: 130  },
    { from: "apurimac",     to: "ayacucho",       km: 357  },
    { from: "moquegua",     to: "puno",           km: 297  },
  ]

};