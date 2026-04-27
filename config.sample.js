export const config = {

	local: {
		prefix: '/imagerater/',
		port: 8052,
		directories: {
			'1': {
				path: 'D:\\foobar',
				title: 'Foobar images'
			},
			'2': {
				path: 'D:\\barbaz',
				title: 'Barbaz images'
			}
		}
	}

}[process.env.NODE_ENV || 'local'];
