const express = require("express"); // Import express
let mysql = require("mysql"); // Import mysql
const bodyParser = require("body-parser"); // Import body-parser
const bcrypt = require("bcrypt"); // Import bcrypt
const cookieParser = require("cookie-parser"); // Import cookie-parser
const sessions = require("express-session"); // Import express-session
const nodemailer = require("nodemailer"); // Import nodemailer
const app = express(); // Create express app

app.use(cookieParser()); // Use cookie-parser

const timeEXp = 1000 * 60 * 60 * 24; // 1 day

app.use( // Use express-session
  sessions({ // Create session
    secret: "rfghf66a76ythggi87au7td", // Secret key
    saveUninitialized: true, // Save uninitialized
    cookie: { maxAge: timeEXp },
    resave: false,
  })
);

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  auth: {
    user: "futureproyect19@gmail.com",
    pass: "tkszkbwfpgmbfgyt",
  },
});

app.use(bodyParser.urlencoded({ extended: true })); // Use body-parser
app.set('view engine', 'ejs');  // Set view engine
app.use('/public/', express.static('./public')); // Use static files

const port = 10101;

const pool = mysql.createPool({
  connectionLimit: 100,
  host: "localhost",
  user: "root",
  password: "Sena1234",
  database: "bellsaved",
  debug: false,
});

app.get('/', (req, res) => {
  let session = req.session; // Get session
  if (session.correo) {
    return res.render('index', { nombres: session.nombres })
  }
  return res.render('index', { nombres: undefined })
})

app.get('/interfaz-registro', (req, res) => { // Get interfaz-registro
  res.render('registro') // Render registro
})

app.post('/registro', (req, res) => { // Post registro
  let correo = req.body.correo;
  let nombres = req.body.nombres;
  let apellidos = req.body.apellidos;
  let contrasenia = req.body.contrasenia;
  const saltRounds = 10;
  const salt = bcrypt.genSaltSync(saltRounds); // Generate salt
  const hash = bcrypt.hashSync(contrasenia, salt); // Generate hash
  pool.query("INSERT INTO usuario VALUES (?, ?, ?, ?)", [correo, nombres, apellidos, hash], // Insert into usuario
    (error) => { // Callback
      if (error) throw error;
      transporter
        .sendMail({
          from: "futureproyect19@gmail.com",
          to: `${correo}`,
          subject: "Ensayo cliente correo",
          html: ` 
          <div> 
          <p>Hola amig@ </p> 
          <p>bienvenido a bellsaved</p> 
          <p>agradecemos tu inscripcion </p> 
          <img src="https://t3.ftcdn.net/jpg/00/77/98/10/360_F_77981059_4bySDu7qHXbK3ql6vKTdlRkP9hAToI2i.jpg">
          </div> 
      ` ,
        })
        .then((res) => {
          console.log(res);
        })
        .catch((err) => {
          console.log(err);
        });
      return res.redirect('/interfaz-login');
    });
});

app.get('/interfaz-login', (req, res) => { // Get interfaz-login
  return res.render('login') // Render login
})

app.post("/login", (req, res) => { // Post login
  let correo = req.body.correo;
  let contrasenia = req.body.contrasenia;
  pool.query("SELECT contrasenia, nombres, apellidos FROM usuario WHERE correo=?", [correo], // Select contrasenia from usuario
    (error, data) => { // Callback
      if (error) throw error;

      if (data.length > 0) {
        let contraseniaEncriptada = data[0].contrasenia; // Get contrasenia

        if (bcrypt.compareSync(contrasenia, contraseniaEncriptada)) { // Compare contrasenia

          let session = req.session; // Get session

          session.correo = correo; // Set session

          session.nombres = `${data[0].nombres} ${data[0].apellidos}`
          return res.redirect('/interfaz-busqueda');
        }

        return res.send("Usuario o contraseña incorrecta");
      }

      return res.send("Usuario o contraseña incorrecta");
    }
  );

  app.get('/perfiles', (req, res) => {
    //seleccionamos los campos de los productos de la tabla articulos
    pool.query("SELECT placa, nombre_propietario, documento_propietario, correo_propietario, telefono_propietario FROM propietario", (error, data) => {
      if (error) throw error;
      //si hay almenos un articulo...
      if (data.length > 0) {
        //recogemos la cookie de sesion
        let session = req.session;
        //verificamos si existe la sesion llamada correo y ademas que no haya expirado y
        //también que
        //sea original, es decir, firmada por nuestro server
        if (session.correo) {
          //se retorna la plantilla llamada articulos al cliente con la info de todos los
          //articulos
          //y se mostrarán los nombres del usuario en el nav
          return res.render('propietario', { nombres: session.nombres, propietario: data })
        }
        //se retorna la plantilla llamada articulos al cliente con la info de todos los
        //articulos
        //y no se mostrarán los nombres del usuario en el nav ya no está logueado
        return res.render('propietario', { nombres: undefined, propietario: data })
      }
      //si no existen articulos en la base de datos...
      return res.send('No hay artículos en este momento');
    });
  })
  app.get('/detalle-producto/:placa', (req, res) => {
    //seleccionamos los campos del producto de la tabla articulos
    pool.query("SELECT placa, nombre_propietario, documento_propietario, correo_propietario, telefono_propietario FROM propietario WHERE placa=?", [req.params.placa], (error, data) => {
      if (error) throw error;
      console.log(data);
      if (data.length > 0) {
        //recogemos la cookie de sesion
        let session = req.session;
        //verificamos si existe la sesion llamada correo y ademas que //no haya expirado y
        //sea original, es decir, firmada por nuestro server
        if (session.correo) {
          //se retorna la plantilla llamada detalle al cliente con la info dettalada del
          //articulo
          //y se mostrarán los nombres del usuario en el nav
          return res.render('detalle', { nombres: session.nombres, propietario: data })
        }
        //se retorna la plantilla llamada detalle al cliente con la info dettalada del articulo
        //y no se mostrarán los nombres del usuario en el nav ya no está logueado
        return res.render('detalle', { nombres: undefined, propietario: data })
      }
      //si no existe el usuario en la base de datos...
      return res.send('A ocurrido un error al cargar el artículo, inténtelo mas tarde');
    });
  })
  app.get('/interfaz-busqueda', (req, res) => { // Get interfaz-registro

    let session = req.session; // Get session
    if (session.correo) {
      return res.render('busqueda', { nombres: session.nombres })
    }
    return res.render('busqueda', { nombres: undefined })

  })

  app.get("/test-cookies", (req, res) => { // Get test-cookies

    let session = req.session; // Get session

    if (session.correo) {
      return res.send(`Usted tiene una sesión en nuestro sistema con correo:
${session.correo}`);
    } else
      return res.send("Por favor inicie sesión para acceder a esta ruta protegida");
  });

  app.get('/logout', (req, res) => {
    let session = req.session;
    if (session.correo) {
      session.destroy();
      return res.redirect('/');
    } else {
      return res.send('Por favor inicie sesión');
    }
  })
});

app.post('/alarma/:placa', (req, res) => {
  //recogemos la cookie de sesion
  let session = req.session;
  //verificamos si existe la sesion llamada correo y ademas que no haya expirado y también
  //que
  //sea original, es decir, firmada por nuestro server
  if (session.correo) {
    //aca obtenemos el código del artículo que pasamos por la ruta como parámetro
    let placa = req.params.placa;
    let correo_propietario=req.params.correo_propietario;
    //insertamos el codigo del articulo comprado y el correo del usuario que lo compró
    pool.query("INSERT INTO alarma(correo2,placa2) VALUES (?, ?)", [session.correo, placa], (error) => {
      if (error) throw error;
      //se retorna la plantilla llamada compraok al cliente notificando que la compra ha sido
      //exitosa

      transporter
        .sendMail({
          from: "futureproyect19@gmail.com",
          to: `${correo_propietario}`,
          subject: "Ensayo cliente correo",
          html: ` 
          <div> 
          <p>Hola !!</p> 
          <p>Bienvendio a bellsaved</p> 
          <p>¿tu carro ha sido encontrado mal parqueado porfavor ve por el </p> 
          </div> 
      ` ,
        })
        .then((res) => {
          console.log(res);
        })
        .catch((err) => {
          console.log(err);
        });

      return res.render('alarma', { nombres: session.nombres })
    });
  } else {
    //si el usuario no está logueado, le enviamos un mensaje para que inicie sesión
    return res.send('Por favor inicie sesión para realizar su compra')
  }
})
app.get('/interfaz-info1', (req, res) => { // Get interfaz-registro
  res.render('informacion1') // Render registro
})
app.get('/interfaz-info2', (req, res) => { // Get interfaz-registro
  res.render('informacion2') // Render registro
})
app.get('/interfaz-oficiales', (req, res) => { // Get interfaz-registro
  res.render('oficiales') // Render registro
})
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});