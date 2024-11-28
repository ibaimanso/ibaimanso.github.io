-- curso: despliegue de aplicaciones web


delete from usuarios;

insert into usuarios values ('admin', md5('admin'),'administrador de la aplicación', '','',0);
