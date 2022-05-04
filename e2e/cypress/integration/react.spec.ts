describe('@uppy/react', () => {
  beforeEach(() => {
    cy.visit('/react')
    cy.get('#dashboard .uppy-Dashboard-input').as('dashboard-input')
    cy.get('#modal .uppy-Dashboard-input').as('modal-input')
    cy.get('#drag-drop .uppy-DragDrop-input').as('dragdrop-input')
  })

  it('should render Dashboard in React and show thumbnails', () => {
    cy.get('@dashboard-input').attachFile(['images/cat.jpg', 'images/traffic.jpg'])
    cy.get('#dashboard .uppy-Dashboard-Item-previewImg')
      .should('have.length', 2)
      .each((element) => expect(element).attr('src').to.include('blob:'))
  })

  it('should render Modal in React and show thumbnails', () => {
    cy.get('#open').click()
    cy.get('@modal-input').attachFile(['images/cat.jpg', 'images/traffic.jpg'])
    cy.get('#modal .uppy-Dashboard-Item-previewImg')
      .should('have.length', 2)
      .each((element) => expect(element).attr('src').to.include('blob:'))
  })

  it('should render Drag & Drop in React and create a thumbail with @uppy/thumbnail-generator', () => {
    const spy = cy.spy()

    cy.window().then(({ uppy }) => uppy.on('thumbnail:generated', spy))
    cy.get('@dragdrop-input').attachFile(['images/cat.jpg', 'images/traffic.jpg'])
    // not sure how I can accurately wait for the thumbnail
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000).then(() => expect(spy).to.be.called)
  })
})
