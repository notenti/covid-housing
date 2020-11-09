function timeSeriesChart() {
    var margin = { top: 20, right: 50, bottom: 40, left: 50 };
    var width = 500 - margin.left - margin.right;
    var height = 300 - margin.top - margin.bottom;
    var updateData;
    var updateLabel;
    var updateFips;
    var data = [];
    var date;
    var label;
    var fips;

    var xScale = d3.scaleTime();
    var yScale = d3.scaleLinear();
    var xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat('%b'));
    var yAxis = d3.axisLeft(yScale);

    function chart(selection) {
        selection.each(function () {
            xScale.domain(d3.extent(data, d => d[0])).range([0, width]);
            yScale.domain(d3.extent(data, d => d[1])).range([height, 0]);

            var line = d3
                .line()
                .x(d => xScale(d[0]))
                .y(d => yScale(d[1]));

            var dom = d3.select(this);

            var svg = dom
                .append('svg')
                .attr('class', 'time-series')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom);

            var svg_text = svg
                .append('text')
                .attr('x', (width + margin.right + margin.left) / 2)
                .attr('y', margin.top * 2)
                .attr('text-anchor', 'middle')
                .style('fill', '#3b4994')
                .style('font-size', '16px')
                .style('font-family', 'Source Sans Pro');

            var genter = svg
                .append('g')
                .attr('transform', `translate(${margin.left}, ${margin.top})`);

            genter.append('g').attr('class', 'x axis');
            genter.append('g').attr('class', 'y axis');
            genter.append('path').attr('class', 'line');

            var g = svg.select('g');

            var lines = g
                .select('.line')
                .datum(data)
                .attr('fill', 'none')
                .attr('stroke', 'steelblue')
                .attr('stroke-width', 1.5)
                .attr('d', line);

            svg.select('.x.axis')
                .attr('transform', 'translate(0,' + yScale.range()[0] + ')')
                .call(xAxis);
            svg.select('.y.axis').call(yAxis);

            updateData = function () {
                const data_up_to_date = data.filter(([key, val]) => key <= date);
                var update = g.select('.line').datum(data_up_to_date);
                xScale.domain(d3.extent(data, d => d[0])).range([0, width]);
                yScale.domain(d3.extent(data, d => d[1])).range([height, 0]);
                svg.select('.x.axis').call(xAxis);
                svg.select('.y.axis').call(yAxis);
                update.transition().duration(1000).attr('d', line);
            };

            updateLabel = function () {
                svg_text.text(`${label.county}, ${label.state}`);
            };
            updateFips = function () {
                dom.attr('fips', fips);
            };
        });
    }

    chart.data = function (value, stop_date) {
        if (!arguments.length) return data;
        data = value;
        date = stop_date;
        if (typeof updateData === 'function') updateData();
        return chart;
    };

    chart.label = function (county, state) {
        if (!arguments.length) return label;
        label = { state: state, county: county };
        if (typeof updateData === 'function') updateLabel();
        return chart;
    };

    chart.fips = function (value) {
        if (!arguments.length) return fips;
        fips = value;
        if (typeof updateData === 'function') updateFips();
        return chart;
    };

    return chart;
}

export { timeSeriesChart };
