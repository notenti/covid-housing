function choropleth(counties, states, mesh) {
    const margin = { right: 50, top: 10, left: 50, bottom: 10 };
    const width = 1200 - margin.right - margin.left;
    const height = 700 - margin.top - margin.bottom;
    var updateEpoch;
    var updateCovid;
    var updateHousing;
    var updateColors;
    var epoch;
    var flattened_covid = [];
    var flattened_housing = [];
    var colors = [];
    var handler;
    var colors_per_class = 0;

    var x = d3.scaleQuantile();
    var y = housing_percent => {
        if (housing_percent > 0.06) {
            return 2;
        } else if (housing_percent > 0.01) {
            return 1;
        } else {
            return 0;
        }
    };

    const color = value => {
        if (!value || !value.get(epoch) || !value.get(epoch)[0].Zhvi) return '#ccc';
        let day_of_interest = value.get(epoch)[0];
        let percent_change_in_housing = day_of_interest.percent_change;
        let confirmed_covid_cases = day_of_interest.normalized_covid;
        return colors[y(percent_change_in_housing) + x(confirmed_covid_cases) * colors_per_class];
    };

    const generateToolTip = d => {
        let county = d.properties.name;
        let state = states.get(d.id.slice(0, 2)).name;
        let covid_per_population = d.properties.vals.get(epoch)[0].normalized_covid;
        let covid_count = d.properties.vals.get(epoch)[0].total_confirmed;
        let housing = '$' + d.properties.vals.get(epoch)[0].Zhvi.toLocaleString();
        let percent_change = d.properties.vals.get(epoch)[0].percent_change;
        return `<p><strong>${county}, ${state}</strong></p>
      <table><tbody>
      <tr><td class='wide'>% of population with COVID-19:</td><td> ${(
          covid_per_population * 100
      ).toFixed(3)}%</td></tr>
      <tr><td class='wide'>Confirmed COVID-19 cases:</td><td> ${covid_count}</td></tr>
      <tr><td class='wide'>ZHVI:</td><td> ${housing}</td></tr>
      <tr><td class='wide'>Annualzied ZHVI Change:</td><td> ${(percent_change * 100).toFixed(
          3
      )}%</td></tr>
      </tbody></table>`;
    };

    function chart(selection) {
        selection.each(function () {
            d3.select(this).select('svg').remove();
            var dom = d3.select(this);
            var svg = dom
                .append('svg')
                .attr('width', width + margin.right + margin.left)
                .attr('height', height + margin.top + margin.bottom);

            var path = d3.geoPath();

            var tip = d3
                .tip()
                .attr('class', 'd3-tip')
                .html((EVENT, d) => generateToolTip(d));

            var cou = svg
                .selectAll('.county')
                .data(counties.features)
                .enter()
                .append('path')
                .attr('class', 'county')
                .attr('d', path)
                .on('mouseover', tip.show)
                .on('mouseout', tip.hide)
                .on('click', (EVENT, d) => handler(epoch, d));

            svg.append('path')
                .datum(mesh)
                .attr('fill', 'none')
                .attr('stroke', 'white')
                .attr('stroke-width', '1px')
                .attr('stroke-linejoin', 'round')
                .attr('d', path);

            svg.call(tip);

            updateEpoch = function () {
                cou.style('fill', d => {
                    return color(d.properties.vals);
                });
            };

            updateCovid = function () {
                x.domain(flattened_covid);
            };

            updateHousing = function () {
                y.domain(flattened_housing);
            };

            updateColors = function () {
                colors_per_class = Math.floor(Math.sqrt(colors.length));
                x.range(d3.range(colors_per_class));
            };
        });
    }

    chart.epoch = function (value) {
        if (!arguments.length) return epoch;
        epoch = value;
        if (typeof updateEpoch === 'function') updateEpoch();
        return chart;
    };

    chart.handler = function (func) {
        if (!arguments.length) return handler;
        handler = func;
        return chart;
    };
    chart.covid = function (value) {
        if (!arguments.length) return flattened_covid;
        flattened_covid = value;
        if (typeof updateCovid === 'function') updateCovid();
        return chart;
    };

    chart.housing = function (value) {
        if (!arguments.length) return flattened_housing;
        flattened_housing = value;
        if (typeof updateHousing === 'function') updateHousing();
        return chart;
    };

    chart.colors = function (value) {
        if (!arguments.length) return colors;
        colors = value;
        if (typeof updateColors === 'function') updateColors();
        return chart;
    };

    return chart;
}

export { choropleth };
